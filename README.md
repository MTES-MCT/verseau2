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
- [Contribution](#contribution)
- [Licence](#licence)

## Description

Verseau2 est une application full-stack permettant le dépôt de fichiers d'autosurveillance. Elle utilise une architecture monorepo avec un backend NestJS et un frontend React.

### Fonctionnalités principales

- 📁 Dépôt de fichiers d'autosurveillance
- ☁️ Stockage sur S3
- ⚡ Traitement asynchrone des fichiers d'autosurveillance
- 🔄 Architecture séparée serveur/worker

## Architecture

Le projet est organisé en monorepo avec les composants suivants :

- **Backend (apps/back)** : API NestJS
  - Serveur HTTP pour l'API REST
  - Worker pour le traitement asynchrone des fichiers
  - Gestion des dépôts et fichiers
  
- **Frontend (apps/front)** : Application React avec Vite
  - Interface utilisateur moderne
  - Communication avec l'API backend

## Prérequis

- Node.js (version 24+)
- npm
- Docker et Docker Compose (pour l'environnement local)
- PostgreSQL (via Docker)
- Compte AWS S3

## Installation

1. Cloner le repository :

```bash
git clone <url-du-repo>
cd verseau2
```

2. Installer les dépendances :

```bash
npm install
```

Cela installera automatiquement les dépendances pour tous les workspaces (backend et frontend).

## Configuration

### Backend

Créer un fichier `.env` dans `apps/back/` avec les variables suivantes :

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=verseau2

# S3
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=verseau2-bucket

# Queue
PGBOSS_CONNECTION_STRING=postgresql://postgres:postgres@localhost:5432/verseau2
```

### Frontend


### Infrastructure locale

Démarrer les services avec Docker Compose :

```bash
cd devops/local
docker-compose up -d
```

Cela démarre :
- PostgreSQL (base de données)
- Mock AWS S3 (stockage S3)

## Utilisation

### Développement

Démarrer l'ensemble de l'application (backend + frontend) :

```bash
npm run dev
```

Ou démarrer les services individuellement :

```bash
# Backend uniquement
npm run dev:back

# Frontend uniquement
npm run dev:front
```

### Production

1. Builder le backend :

```bash
cd apps/back
npm run build
```

2. Builder le frontend :

```bash
cd apps/front
npm run build
```

3. Démarrer le backend en production :

```bash
cd apps/back
npm run start:prod
```

## Scripts disponibles

### Root

- `npm run dev` : Démarre backend et frontend en mode développement
- `npm run dev:back` : Démarre uniquement le backend
- `npm run dev:front` : Démarre uniquement le frontend

### Backend (apps/back)

- `npm run start:dev` : Démarre le serveur en mode watch
- `npm run start:server:dev` : Démarre uniquement le serveur HTTP
- `npm run start:worker:dev` : Démarre uniquement le worker
- `npm run build` : Compile le projet
- `npm run test` : Lance les tests unitaires
- `npm run test:e2e` : Lance les tests end-to-end
- `npm run lint` : Lint et corrige le code

### Frontend (apps/front)

- `npm run dev` : Démarre le serveur de développement Vite
- `npm run build` : Compile pour la production
- `npm run preview` : Prévisualise le build de production
- `npm run lint` : Lint le code

## Technologies

### Backend

- **NestJS** : Framework Node.js
- **TypeORM** : ORM pour PostgreSQL
- **pg-boss** : File d'attente basée sur PostgreSQL
- **AWS SDK** : Client S3 pour le stockage de fichiers
- **TypeScript** : Langage de programmation
- **Jest** : Framework de tests

### Frontend

- **React** : Bibliothèque UI
- **Vite** : Build tool et dev server
- **TypeScript** : Langage de programmation

### Infrastructure

- **PostgreSQL** : Base de données
- **Docker** : Conteneurisation
- **MinIO** : Stockage S3 compatible (local)

## Structure du projet

```
verseau2/
├── apps/
│   ├── back/              # Application backend NestJS
│   │   ├── src/
│   │   │   ├── depot/     # Module de gestion des dépôts
│   │   │   ├── infra/     # Infrastructure (DB, S3, Queue)
│   │   │   ├── shared/    # Code partagé
│   │   │   ├── worker/    # Workers asynchrones
│   │   │   ├── mainServer.ts
│   │   │   └── mainWorker.ts
│   │   └── test/
│   └── front/             # Application frontend React
│       └── src/
├── devops/
│   └── local/             # Configuration Docker locale
│       └── docker-compose.yml
├── packages/              # Packages partagés (futurs)
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
- ESLint pour la qualité du code
- Prettier pour le formatage
- Git hooks avec Husky pour validation pre-commit

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
npm run test

# Tests avec coverage
npm run test:cov

# Tests e2e
npm run test:e2e

# Tests en mode watch
npm run test:watch
```

