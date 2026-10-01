# Convention des logs backend

Utiliser `LoggerService` pour les logs de l'API, du worker et des intégrations.
Les scripts autonomes de génération de données peuvent conserver leur sortie console.

| Niveau  | Usage                                                                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `debug` | Détails internes : requêtes SQL ordinaires, résultats de recherches intermédiaires, traces de méthodes et polling répétitif.                     |
| `log`   | Parcours opérationnel visible par défaut : début/fin des jobs, téléchargements, parsing, contrôles, appels aux intégrations et résultats métier. |
| `warn`  | Refus d'une requête client, anomalie récupérée, fonctionnement dégradé ou échec transitoire avec reprise prévue.                                 |
| `error` | Échec technique inattendu, définitif ou nécessitant une intervention. Une exception inattendue reste une erreur même si pg-boss peut réessayer.  |

- Un rejet métier de dépôt est un résultat normal (`log`), pas une panne technique, y compris lorsqu'il est traité dans un `catch`.
- Les logs des mocks restent en `warn` pour que l'administrateur voie qu'un fournisseur mock est utilisé.
- Les logs par défaut doivent permettre de retracer le parcours d'un dépôt et la dernière étape atteinte
  sans activer `debug`. Celui-ci est réservé aux détails supplémentaires, pas aux étapes du traitement.
- Le début du polling SANDRE et son résultat final restent en `log` ; les tentatives ordinaires répétées
  (y compris leurs logs de job) sont en `debug`. Les erreurs de polling restent en `error` et la décision de reprise en `log`.
- La prise en charge d'un doublon idempotent dans un `catch` est en `log` : c'est une décision métier attendue.
- Le niveau qui prend en charge l'exception porte le log `warn`/`error`.
  Les `catch` des traitements métier restent en `log` pour rendre leurs résultats et décisions visibles par défaut,
  même si l'exception technique est ensuite propagée. Les diagnostics des adaptateurs techniques et `TraceCalls` restent en `debug`.
  Le worker journalise une seule fois en `error` les exceptions techniques propagées avec `queueName`, `jobId` et `depotId`.
  Les processeurs qui absorbent une erreur conservent leur propre log selon sa gravité.
- Les logs HTTP sont des résumés distincts : 2xx/3xx en `log`, 4xx en `warn`, 5xx en `error` ; sans stack ni query string.
- Les échecs SQL restent en `error` pour conserver le diagnostic de la requête sans activer `debug`, sans valeurs des paramètres.
- Passer l'objet `Error` plutôt que seulement son message : le logger préserve nom, message, stack et cause.
- Sélectionner les métadonnées utiles ; ne pas journaliser corps HTTP, fichiers XML, pièces jointes,
  utilisateurs complets, paramètres SQL, cookies ou secrets. Aucun masquage automatique n'est effectué :
  ne jamais passer d'identifiants dans les contextes de log.
- Le `correlationId` est automatiquement préfixé par le logger, y compris en `verbose` et `fatal`.

Par défaut, `log`, `warn` et `error` sont actifs. `LOGS_LEVEL=debug` ajoute les diagnostics ;
`LOGS_LEVEL=verbose` active également les traces verbeuses. `TIMESTAMP_LOGGING=true` active l'horodatage.
