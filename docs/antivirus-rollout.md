# Mise en service de l'antivirus privé

Ce document prépare une **opération à réaliser**, pas un compte rendu de déploiement. Le scanner a passé son recontrôle indépendant après corrections ; les gates API/worker/UI sont encore en cours d'intégration et leur validation finale reste un prérequis de release. Aucun résultat Docker ne prouve le fonctionnement de l'image Scalingo.

Références canoniques, sans recopier leur configuration complète :

- [Scanner autonome : variables, buildpacks, limites et exploitation](../apps/antivirus/README.md)
- [Contrat HTTP et routes de santé](../apps/antivirus/CONTRACT.md)
- [Adaptateur backend et stockage one-to-one](../apps/back/src/infra/antivirus/README.md)

## 1. Preuves CI avant release

Avec Node 24 et pnpm 12.5.0, depuis la racine :

```sh
pnpm install --frozen-lockfile
```

Le scanner a aussi son propre `pnpm-lock.yaml` et `pnpm-workspace.yaml`. Pour prouver qu'il n'emprunte aucune dépendance du monorepo, reproduire la copie isolée utilisée en CI :

```sh
standalone_dir=$(mktemp -d)
tar --exclude='./node_modules' --exclude='./dist' -C apps/antivirus -cf - . | tar -xf - -C "$standalone_dir"
cd "$standalone_dir"
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm test:integration:docker
```

Le dernier script existant construit son image Docker, charge les signatures officielles et teste un vrai clamd ; il exige Docker, environ 4 Gio et l'accès aux dépôts/CDN. Une indisponibilité réseau est un échec, pas un test ignoré. On peut aussi l'exécuter directement depuis `apps/antivirus`.

Dans `.github/workflows/test.yml` :

- `build-and-tests` ajoute `verseau-antivirus` à la matrice complète ; les changements limités aux sources du scanner ou à son propre lockfile sélectionnent seulement cette cible. Exception : `apps/antivirus/package.json` déclenche la **matrice complète**, comme tout manifeste couvert par le filtre global `**/package.json`. La cible scanner installe/build/test la copie isolée avec son propre lockfile.
- `antivirus-real-clamav` exécute `pnpm test:integration:docker` sur Ubuntu avec Docker pour les changements scanner, dépendances partagées/racine ou workflows. Ce n'est pas un faux daemon ni le test unitaire ordinaire.
- Les autres cibles conservent leurs commandes, notamment `back test:ci`. Un cache de modules ne dispense jamais du frozen install racine. Le déclenchement E2E navigateur par label `e2e` ou planification reste inchangé.

Recontrôle indépendant du scanner au 2026-11-05 : **PASS WITH NOTES**, aucun constat matériel restant après correction des routes de santé, de la course de dépassement de taille et de la fixture instable. Frozen install/build autonomes et **31/31** tests unitaires passent ; **30/30** répétitions des tests de course/limites passent, dont 100 courses et 100 scans après dépassement. Le vrai ClamAV **1.4.6** passe XML propre, EICAR, limites, exactement **73 400 320 octets**, dépassement `413` avec hash null et scan suivant. Ces preuves concernent le scanner, pas encore l'enforcement intercomposants ni l'image Scalingo ; conserver les versions moteur/signatures et relancer les vérifications pertinentes sur le commit final.

## 2. Scanner d'abord, sans exposition publique

1. Créer une application scanner séparée, dans la même région et le même projet que Verseau2, et l'attacher au **même Private Network** que l'API et le worker. Le projet seul ne suffit pas. Définir `PROJECT_DIR=apps/antivirus` avant le premier build ; aucun accès DB/S3 n'est nécessaire au scanner.
2. Utiliser les buildpacks ClamAV puis Node, le hook `scalingo-postbuild` et le `Procfile` du scanner. Ne pas lancer clamd/freshclam une seconde fois dans le process Node. Les superviseurs des buildpacks les possèdent.
3. Définir `NODE_ENV=production`, `ANTIVIRUS_PRIVATE_ONLY=true`, `ANTIVIRUS_PORT=3011` et `ANTIVIRUS_TOKEN` via le gestionnaire de secrets. Laisser la plateforme injecter `SCALINGO_PRIVATE_HOSTNAME` : le service doit écouter **l'adresse privée résolue de ce hostname**, jamais `0.0.0.0`, ni le `PORT` public.
4. Formation obligatoire : **`scanner:1`, `web:0`**, aucun process public `tcp`/`postdeploy` servant le scanner, domaine public ou routeur requis. Vérifier la formation et l'interface réellement liée, pas seulement les variables déclarées.
5. Fixer explicitement `CLAMAV_VERSION` à une version supportée auditée. Au contrôle du 2026-11-05, le [défaut upstream](https://github.com/Scalingo/clamav-buildpack/blob/master/DEFAULT_VERSIONS) était encore **1.4.2** : ne pas l'hériter. **1.4.6** est la version du recontrôle réel Docker, pas une certification de disponibilité du binaire pour le stack Scalingo choisi. Vérifier disponibilité, politique générée et version réellement démarrée sur ce stack avant release.
6. Démarrer en **2XL**. Mesurer des XML réalistes jusqu'à **70 Mio**, les budgets de décompression et surtout le pic RAM **pendant un rechargement concurrent des signatures**. Ne réduire la taille qu'après une campagne démontrant la marge RSS/CPU/scratch et les latences p95/p99 ; c'est un gate de release, pas une estimation. Ne pas augmenter la concurrence de 1 pour masquer la saturation.

Découvrir le DNS du process, sans figer un numéro/IP de conteneur :

```sh
scalingo --app <scanner-app> private-networks-domain-names
```

Configurer le backend avec l'origine retournée pour **`scanner`**, par exemple :

```text
ANTIVIRUS_URL=http://scanner.ap-<application-uuid>.pn-<private-network-uuid>.private-network.internal:3011
ANTIVIRUS_TOKEN=<même secret ANTIVIRUS_TOKEN que sur le scanner>
ANTIVIRUS_TIMEOUT_MS=150000
```

Le DNS nu de l'application cible implicitement `web` et ne convient pas. Garder les délais emboîtés : budget clamd **90000 ms**, scanner **120000 ms**, client backend **150000 ms** ; prévoir aussi téléchargement/persistance dans l'expiration du job worker. Pas de replay HTTP automatique des POST.

## 3. Recette réseau et protocole depuis le worker

Depuis un conteneur **worker réel**, avec ses variables injectées et sans afficher le token, vérifier les routes exactes (pas `/live` ou `/ready`) :

```sh
node --input-type=module <<'NODE'
const { ANTIVIRUS_URL: origin, ANTIVIRUS_TOKEN: token } = process.env;
if (!origin || !token) throw new Error('Configuration antivirus absente');
for (const route of ['/health/live', '/health/ready']) {
  const response = await fetch(new URL(route, origin), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status !== 200) throw new Error(`${route}: HTTP ${response.status}`);
  const result = await response.json();
  if (result.status !== (route.endsWith('/ready') ? 'ready' : 'live')) {
    throw new Error(`${route}: réponse inattendue`);
  }
  console.log(route, response.status, result.status);
}
const denied = await fetch(new URL('/health/live', origin), {
  headers: { Authorization: 'Bearer invalid-token' },
  signal: AbortSignal.timeout(10000),
});
if (denied.status !== 401) throw new Error('Authentification non appliquée');
NODE
```

La readiness doit prouver PING/VERSION et signatures chargées récentes ; liveness seule ne suffit pas et readiness ne réserve pas le slot de scan. Compléter avec XML propre → clean + hash/taille exacts, EICAR inoffensif → infected, limites → unscannable, concurrence → BUSY, panne/délai/signatures périmées → refus non clean. Utiliser uniquement des fixtures de test, jamais des données métier dans les journaux.

Depuis **hors du Private Network**, tester les éventuels noms/adresses publics et l'accès au port 3011 : aucune réponse du scanner ne doit être accessible, même un `401`. Une simple erreur d'authentification ne prouve pas l'isolement. Vérifier aussi l'absence de process `web`/`tcp`, de binding public et de proxy vers le service. Conserver cette preuve avec la recette interne ; ces vérifications de plateforme n'ont pas été exécutées ici.

## 4. Migration, API et worker : ordre compatible

1. Valider le scanner privé et sa capacité avant de basculer les consommateurs. Préparer un créneau contrôlé : suspendre les anciens workers et les accès aux fichiers pendant la transition pour qu'aucune ancienne instance ne contourne les nouvelles gates. Les jobs déjà en queue ou différés ne constituent pas une exception.
2. Appliquer la migration additive **`AddAntivirusAnalysis1793836800000`** avant tout démarrage d'API/worker qui joint la nouvelle relation (`RUN_MIGRATIONS_ON_STARTUP=true` sur l'API, ou procédure de migration contrôlée). Elle crée seulement `antivirus_analysis`, avec FK **unique** `depot_id` vers `depot` ; aucune colonne antivirus n'est ajoutée à `depot`. Vérifier la migration sur une copie représentative et garder une sauvegarde.
3. Déployer l'API et le worker compatibles avec cette table et le contrat HTTP, avec la même origine/token. Les nouvelles instances exigent la table ; les anciennes tolèrent son ajout mais **n'appliquent pas les gates**, donc ne pas laisser d'anciens consommateurs servir des fichiers ou dépiler des jobs après bascule. Déployer le front compatible avec le statut dérivé ; un statut omis signifie pending, jamais clean.
4. Avant reprise, prouver le scan des **octets de l'objet S3 de traitement figé** par la queue `antivirus_scan` (`AntivirusProcessorService`), en streaming direct S3 → HTTP sans buffer complet ni fichier temporaire, avant décodage/parsing, et la liaison du verdict au chemin/hash/taille. Le verdict clean et la publication de `process_file` sont atomiques ; `FileProcessorService` exige ensuite le statut clean avant téléchargement/parsing et publication des contrôles métier. Les contrôles métier, SANDRE, SFTP/FTP et la diffusion de rapports font confiance à ce passage, sans revalidation antivirus ni recalcul du hash. Les téléchargements XML vérifient uniquement le statut clean enregistré. Les anciens jobs `process_file` non scannés ne lancent plus de scan : organiser leur passage préalable par `antivirus_scan` avant reprise, ainsi que celui des jobs aval historiques. Tester les redémarrages/retries, les deux dead letters (`antivirus_scan_failed`, `process_file_failed`) et maintenir l'immuabilité de l'objet S3 de traitement.
5. Vérifier les résultats persistés (métadonnées complètes, une analyse par dépôt), la distinction infection/échec déterministe/panne temporaire, les retries bornés avec backoff et leur épuisement. Une panne scanner n'autorise aucun fallback clean ; une notification/relance ne doit pas exporter les octets bloqués.
6. Rouvrir progressivement les flux après les tests intercomposants et la revue indépendante du commit final. Surveiller backlog, temps d'attente et erreurs avant d'augmenter le débit.

**Historique :** une analyse absente est **pending et bloque le téléchargement XML**, y compris pour un ancien dépôt auparavant terminé. La migration ne crée aucun verdict clean. Les jobs aval historiques ne recontrôlent pas l'antivirus : leur reprise doit être conditionnée à un scan préalable. Prévoir et faire valider l'impact utilisateur avant activation ; un rattrapage éventuel doit scanner chaque objet figé et enregistrer ses preuves. Aucun bulk backfill clean ni outil de rattrapage n'est fourni par ce runbook.

## 5. Exploitation et retour sûr

- Alertes internes : readiness manquante, âge des signatures/updater, erreurs et timeouts, BUSY/saturation, backlog/retries épuisés, latences de scan et de bout en bout, RSS/CPU/scratch/OOM/redémarrages, particulièrement pendant les reloads. Ne pas compter sur les métriques du routeur public pour le trafic privé.
- Journaux : verdict/code stable/durée et identifiants opérationnels strictement nécessaires ; jamais XML, token, headers, nom original, hash de contenu, détection brute, URL secrète ou configuration d'un client HTTP. Ne pas publier le token dans un argument de commande, l'historique shell ou une sonde publique.
- Rotation du secret : coordonner scanner et clients (un seul token actif), fenêtre de blocage acceptée plutôt qu'une ouverture sans authentification. Refaire la recette après changement moteur/buildpack/contrat.
- En incident : suspendre les consommateurs et les accès aux fichiers concernés, rétablir une version **avec gates** et conserver la table/verdicts pour l'audit. Revenir à un backend pré-antivirus peut réautoriser des fichiers non analysés : ce n'est pas un rollback sûr. Ne pas supprimer la table ni marquer clean pour débloquer la queue.

Sources plateforme : [monorepo PROJECT_DIR](https://doc.scalingo.com/platform/app/monorepo), [interfaces/process privés](https://doc.scalingo.com/platform/networking/private/working-with-private-networks), [DNS privé](https://doc.scalingo.com/platform/networking/private/concepts). Les détails de cycle de vie et limites restent dans le README du scanner.
