const fs = require('fs');
const config = require('./config');
const S3Service = require('./s3-service');
const PgService = require('./pg-service');
const BlueGreenSchemaManager = require('./blue-green-manager');
require('./server');

async function main() {
  let tempFilePath = null;

  try {
    if (!config.aws.bucket) {
      throw new Error('Missing S3 configuration. Please check .env file.');
    }
    if (!config.pg.database && !config.pg.connectionString) {
      throw new Error('Missing Postgres configuration. Please check .env file.');
    }

    const s3Service = new S3Service(config);
    const pgService = new PgService(config);
    const blueGreenManager = new BlueGreenSchemaManager(config);

    // Étape 1 : Télécharger le dump depuis S3
    console.log('=== Étape 1/4 : Téléchargement du dump depuis S3 ===');
    tempFilePath = await s3Service.downloadFile();
    console.log('Downloaded file:', tempFilePath);

    // Étape 2 : Déterminer la couleur cible et restaurer le dump
    console.log('\n=== Étape 2/4 : Restauration du dump ===');
    const currentColor = await blueGreenManager.getCurrentActiveColor();
    const targetColor = await blueGreenManager.getTargetColor();
    console.log(`Couleur active actuelle : ${currentColor ?? 'aucune (première exécution)'}`);
    console.log(`Couleur cible : ${targetColor}`);

    // Restaure le dump normalement puis renomme les schémas
    await pgService.restoreDatabase(tempFilePath, targetColor);

    // Étape 3 : Valider et créer/mettre à jour les vues
    console.log('\n=== Étape 3/4 : Validation et création des vues ===');
    await blueGreenManager.validateSchema(targetColor);
    await blueGreenManager.switchToColor(targetColor);

    // Étape 4 : Supprimer l'ancien schéma coloré
    console.log('\n=== Étape 4/4 : Nettoyage ===');
    if (currentColor !== null) {
      await blueGreenManager.cleanupOldSchema(currentColor);
    } else {
      console.log('Première exécution, pas de schéma à nettoyer.');
    }

    console.log('\nCleaning up temporary file...');
    if (tempFilePath) {
      fs.unlinkSync(tempFilePath);
    }
    console.log('Cleanup done.');

    console.log('\n✅ Sync process finished successfully with ZERO DOWNTIME!');
    console.log(`   Active schema: ${targetColor}`);
  } catch (error) {
    console.error('\n❌ Sync process failed:', error);

    // Nettoyage du fichier temporaire en cas d'erreur
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      console.log('Cleaning up temporary file after error...');
      fs.unlinkSync(tempFilePath);
    }

    process.exit(1);
  }
}

main();
