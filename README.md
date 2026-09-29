# Verseau2

Application de dépôts de fichiers d'autosurveillance

## 📋 Table des matières

- [Description](#description)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Scripts disponibles](#scripts-disponibles)
- [Technologies](#technologies)
- [Structure du projet](#structure-du-projet)
- [Développement](#développement)
- [Tests](#tests)

## Description

Verseau2 est une application full-stack permettant le dépôt de fichiers d'autosurveillance. Elle utilise une architecture monorepo avec un backend NestJS et un frontend React.

### Fonctionnalités principales

- 📁 Dépôt de fichiers d'autosurveillance
- ☁️ Stockage sur S3 (Outscale ou mock local)
- ⚡ Traitement asynchrone des fichiers d'autosurveillance
- 🔄 Architecture séparée serveur/worker
- ✅ Contrôles SANDRE et format V1
- 🔐 Authentification OIDC
- 📊 Référentiels Roseau et Lanceleau
- 📧 Système de notifications par email
- 📤 Export SFTP

## Architecture

Le projet est organisé en monorepo avec les composants suivants :

- **Backend (apps/back)** : API NestJS
  - Serveur HTTP pour l'API REST
  - Worker pour le traitement asynchrone des fichiers
  - Modules principaux :
    - `dossier` : Gestion des dépôts et contrôles
    - `referentiel` : Référentiels Roseau et Lanceleau
    - `user` : Gestion des utilisateurs
    - `authentication` : Authentification OIDC
    - `notification` : Système de notifications (email)
    - `infra` : Infrastructure (DB, S3, Queue, SFTP)
- **Frontend (apps/front)** : Application React avec Vite
  - Interface utilisateur basée sur le Design System de l'État (DSFR)
  - Communication avec l'API backend

- **Packages partagés**
  - `@lib/dossier` : Types et DTOs partagés
  - `@lib/parser` : Parser XML pour fichiers SANDRE

## Prérequis

- Node.js (version 24.15 minimum)
- pnpm (version 12+)
- Docker et Docker Compose (pour l'environnement local)
- PostgreSQL (via Docker)
- Stockage S3 compatible (AWS S3, Outscale, ou mock local)

## Installation

1. Cloner le repository :

```bash
git clone <url-du-repo>
cd verseau2
```

2. Installer les dépendances :

```bash
pnpm install
```

Cela installera automatiquement les dépendances pour tous les workspaces (backend et frontend).

## Configuration

### Backend

Créer un fichier `.env` dans `apps/back/` basé sur `example.env` :

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/verseau2

# S3 Configuration
S3_PROVIDER=mock # ou outscale
S3_BUCKET=MY_BUCKET
S3_ENDPOINT=OUTSCALE_ENDPOINT
# Optionnel si l'endpoint interne n'est pas accessible depuis le navigateur
# S3_PUBLIC_ENDPOINT=http://localhost:9090
S3_UPLOAD_URL_TTL_SECONDS=900
S3_REGION=OUTSCALE_REGION
S3_ACCESS_KEY=MY_ACCESS_KEY
S3_SECRET_KEY=MY_SECRET_KEY

# SANDRE Mock Configuration (pour les tests)
USE_SANDRE_MOCK=false

# Logs
LOGS_LEVEL=debug # ou verbose

# Email
EMAIL_PROVIDER=mock # ou brevo ou mailcatcher

# OpenID Connect
OIDC_ISSUER_URL=https://your-oidc-provider/.well-known/openid-configuration
OIDC_CLIENT_ID=your-client-id
OIDC_MOCK=false
OIDC_FAKE_TOKEN=change-me

 # SFTP Configuration
 SFTP_PROVIDER=mock # ou real
 SFTP_HOST=localhost
 SFTP_PORT=22
 SFTP_USERNAME=user
 SFTP_PRIVATE_KEY=key

 # SFTP/FTP Agency Configuration
 SFTP_AGENCY_PROVIDER=mock # ou real
 # Configuration JSON des clients de transfert pour chaque agence de l'eau
 # Format SFTP par défaut: {"agence_id": {"host": "hostname", "port": 22, "username": "user", "remotePath": "base/path"}}
 # Format FTP/FTPS: {"agence_id": {"type": "ftp", "host": "hostname", "port": 21, "username": "user", "remotePath": "base/path", "secure": true}}
 SFTP_AGENCY_CONFIG={ "11111111111111": { "host": "sftp1.example.com", "port": 22, "username": "user1", "remotePath": "test-agency-1" }, "22222222222222": { "type": "ftp", "host": "ftp2.example.com", "port": 21, "username": "user2", "remotePath": "test-agency-2", "secure": true } }
 # Pour chaque agence SFTP, fournir soit une clé privée, soit un mot de passe. Pour FTP, fournir un mot de passe.
 # Clés privées encodées en base64 pour chaque agence, le fournisseur Cloud ne gère pas les VE multi-ligne
 SFTP_AGENCY_PRIVATE_KEY_11111111111111=base64
 SFTP_AGENCY_PASSWORD_22222222222222=mot-de-passe
```

#### Dépôts directs vers S3

Le fichier est envoyé par le navigateur directement à S3. L'API reçoit uniquement les métadonnées :

1. `POST /api/depot/upload/init` avec `{ fileName, size, contentType }` crée le dépôt et renvoie `{ depotId, uploadUrl, headers, expiresAt }`.
2. Le navigateur fait un `PUT` du fichier brut vers `uploadUrl`, avec les `headers` renvoyés, sans cookie API.
3. `POST /api/depot/:id/upload/complete` vérifie l'objet avec `HEAD`, le copie côté S3 vers sa clé définitive et publie `process_file`. La confirmation et le job pg-boss sont enregistrés dans la même transaction PostgreSQL. Les confirmations répétées sont idempotentes.

La taille maximale reste **70 Mio** : les métadonnées sont validées à l'initialisation et la taille exacte déclarée est liée à l'URL présignée via l'en-tête signé `Content-Length`. S3 refuse ainsi un PUT de taille différente. Le navigateur génère automatiquement cet en-tête à partir du fichier brut ; le front ne doit pas le définir manuellement. La taille réelle est également vérifiée à la confirmation. Le XML et les droits métier sont vérifiés par le worker.

Les URL expirent après 900 secondes (configurable entre 60 et 3600 via `S3_UPLOAD_URL_TTL_SECONDS`). La confirmation reste possible pendant une heure après cette échéance pour reprendre un upload déjà terminé. Un job différé `cleanup_depot_upload` supprime ensuite l'objet temporaire et marque les dépôts non confirmés en échec. Il conserve les fichiers définitifs des dépôts confirmés. Une règle de cycle de vie S3 supprimant le préfixe `uploads/` après un jour complète ce nettoyage, notamment pour les transferts terminant très tardivement.

**Déploiement :** appliquer la migration `DirectDepotUpload1790294400000`, configurer les CORS du bucket, puis déployer l'API, le worker et le front. L'ancien endpoint multipart `/api/depot/upload` est remplacé ; `scripts/upload_xml.js` utilise le nouveau protocole.

Le bucket Outscale doit autoriser les origines exactes du front (adapter l'exemple) :

```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://saineau.beta.gouv.fr"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }]
}
```

Le compte S3 de l'API/worker doit pouvoir écrire, lire les métadonnées, copier et supprimer les objets du bucket. Aucune clé d'accès S3 n'est transmise au navigateur. Pour `S3_PROVIDER=mock`, Adobe S3Mock autorise déjà les requêtes CORS vers les objets (origine `*`) et ne prend pas en charge la configuration CORS du bucket par l'API S3. En Docker, conserver `S3_ENDPOINT` pour les échanges internes et définir `S3_PUBLIC_ENDPOINT` avec l'adresse accessible au navigateur ; l'URL est signée avec cette adresse, sans réécriture après signature.

#### Pools PostgreSQL

Sur le PaaS, le `Procfile` définit `PROCESS_TYPE=api|worker`. TypeORM sélectionne ainsi `DATABASE_POOL_API` ou `DATABASE_POOL_WORKER`; les lancements locaux conservent le pool par défaut. Un rôle ou un pool invalide bloque le démarrage, et la configuration retenue est journalisée.

### Frontend

Créer un fichier `.env` dans `apps/front/` basé sur `src/example.env` :

```env
VITE_API_BASE_URL=http://localhost:3000
```

### Infrastructure locale

Démarrer les services avec Docker Compose :

```bash
cd devops/local

docker-compose up -d
```

Cela démarre :

- PostgreSQL (base de données)
- S3Mock (Adobe S3Mock pour stockage S3)
- App (application complète - optionnel)
- sync-pg (outil de synchronisation de base de données - optionnel)

## Utilisation

### Développement

Démarrer l'ensemble de l'application (backend + frontend) :

```bash
pnpm dev
```

Ou démarrer les services individuellement :

```bash
# Backend uniquement
pnpm dev:back

# Frontend uniquement
pnpm dev:front
```

### Production

1. Builder l'ensemble du projet :

```bash
pnpm build
```

2. Démarrer le backend en production (serveur + worker) :

```bash
pnpm start
```

Le frontend compilé est servi automatiquement par le backend via le module `FrontendStaticModule`.

## Scripts principaux

```bash
pnpm dev          # Démarre backend + frontend
pnpm build        # Compile le projet
pnpm test         # Lance les tests (back + parser)
pnpm clean        # Nettoie tous les workspaces
pnpm knip         # Analyse du code inutilisé
```

## Technologies

### Backend

- **NestJS 11** : Framework Node.js
- **TypeORM** : ORM pour PostgreSQL
- **pg-boss** : File d'attente basée sur PostgreSQL
- **AWS SDK v3** : Client S3 pour le stockage de fichiers
- **TypeScript** : Langage de programmation
- **Jest** : Framework de tests
- **Testcontainers** : Tests d'intégration avec PostgreSQL
- **OpenID Client** : Authentification OIDC
- **ssh2-sftp-client** : Client SFTP
- **basic-ftp** : Client FTP/FTPS pour les agences de l'eau

### Frontend

- **React 19** : Bibliothèque UI
- **Vite** : Build tool et dev server
- **TypeScript** : Langage de programmation
- **@codegouvfr/react-dsfr** : Design System de l'État Français
- **React Router 7** : Routage
- **TanStack Query** : Gestion des requêtes API

### Infrastructure

- **PostgreSQL** : Base de données
- **Docker** : Conteneurisation
- **Adobe S3Mock** : Stockage S3 compatible (local)
- **Outscale** : Fournisseur S3 (production)

## Structure du projet

```
verseau2/
├── apps/
│   ├── back/              # Application backend NestJS
│   │   ├── src/
│   │   │   ├── api/           # Module API principal
│   │   │   ├── dossier/       # Gestion des dépôts et contrôles
│   │   │   │   ├── depot/     # Dépôts de fichiers
│   │   │   │   └── controle/  # Contrôles SANDRE et V1
│   │   │   ├── referentiel/   # Référentiels (Roseau, Lanceleau)
│   │   │   ├── user/          # Gestion des utilisateurs
│   │   │   ├── authentication/# Authentification OIDC
│   │   │   ├── notification/  # Système de notifications
│   │   │   ├── infra/         # Infrastructure (DB, S3, Queue, SFTP)
│   │   │   ├── shared/        # Code partagé
│   │   │   ├── worker/        # Workers asynchrones
│   │   │   ├── mainServer.ts  # Point d'entrée serveur HTTP
│   │   │   └── mainWorker.ts  # Point d'entrée worker
│   │   └── test/          # Tests e2e
│   └── front/             # Application frontend React
│       └── src/
│           ├── components/    # Composants réutilisables
│           ├── pages/         # Pages de l'application
│           └── api/           # Client API
├── packages/              # Packages partagés
│   ├── dossier/           # Types et DTOs partagés
│   └── parser/            # Parser XML SANDRE
├── devops/
│   ├── local/             # Configuration Docker locale
│   │   └── docker-compose.yml
│   └── tools/             # Outils DevOps
│       └── sync-pg/       # Synchronisation base de données
└── package.json           # Configuration monorepo
```

## Développement

### Architecture hexagonale

Le backend suit une architecture hexagonale avec :

- **Entities** : Entités métier
- **Use Cases** : Logique métier
- **Repositories** : Abstraction de persistance
- **Controllers** : Points d'entrée HTTP
- **Services** : Orchestration

### Conventions de code

- Utilisation de TypeScript strict
- ESLint pour la qualité du code (ESLint 9 avec flat config)
- Prettier pour le formatage
- Git hooks avec Husky pour validation pre-commit

### Conventions de nommage

#### Backend

- **Fichiers** :
  - `camelCase` pour les fichiers TypeScript : `depot.service.ts`, `depot.controller.ts`
  - Suffixes selon le type : `.entity.ts`, `.service.ts`, `.controller.ts`, `.repository.ts`, `.gateway.ts`, `.module.ts`, `.dto.ts`, `.guard.ts`, `.decorator.ts`
- **Classes et Interfaces** :
  - `PascalCase` pour les classes : `DepotEntity`, `DepotService`, `DepotController`
  - `PascalCase` pour les interfaces/gateways : `DepotGateway`, `RoseauGateway`
  - Suffixes explicites : `Entity`, `Service`, `Controller`, `Repository`, `Gateway`, `Module`, `Guard`, `Decorator`

- **Use Cases** :
  - `PascalCase` avec nom descriptif : `DeposerUnFichier`
  - Fichier en `camelCase` : `deposerUnFichier.ts`

- **Variables et fonctions** :
  - `camelCase` : `depotService`, `findUserById()`, `createDepot()`

- **Constantes et enums** :
  - `PascalCase` pour les enums : `SandreTags`, `DepotStatus`
  - `UPPER_SNAKE_CASE` pour les variables d'environnement : `DATABASE_URL`, `S3_PROVIDER`

#### Frontend

- **Fichiers** :
  - `PascalCase` pour les composants React : `Dashboard.tsx`, `DepotUpload.tsx`
  - `camelCase` pour les utilitaires : `controleMapper.ts`, `useDepotRecap.ts`

- **Composants** :
  - `PascalCase` : `Dashboard`, `FileDropZone`, `StatCard`

- **Hooks personnalisés** :
  - Préfixe `use` + `PascalCase` : `usePagination`, `useDepotRecap`

- **Dossiers** :
  - `kebab-case` pour les dossiers de fonctionnalités : `depot-upload-recap/`
  - `camelCase` ou lowercase pour les dossiers techniques : `components/`, `pages/`, `api/`

### Environnements de mock

Le projet supporte plusieurs environnements de mock pour faciliter le développement :

- **SANDRE Mock** : `USE_SANDRE_MOCK=true` - Mock le service de validation SANDRE
- **S3 Mock** : `S3_PROVIDER=mock` - Utilise Adobe S3Mock pour le stockage
- **Email Mock** : `EMAIL_PROVIDER=mock` - Mock l'envoi d'emails
- **SFTP Mock** : `SFTP_PROVIDER=mock` - Mock le serveur SFTP
- **OIDC Mock** : `OIDC_MOCK=true` - Mock l'authentification OIDC

### Ajout de fonctionnalités

1. Créer une branche feature : `git checkout -b feature/nom-feature`
2. Développer et tester
3. Commiter avec des messages clairs
4. Créer une pull request

## Tests

### Backend

```bash
cd apps/back

# Tests unitaires
pnpm test

# Tests avec coverage
pnpm test:cov

# Tests e2e
pnpm test:e2e

# Tests en mode watch
pnpm test:watch
```
