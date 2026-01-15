const { spawn } = require('child_process');

class PgService {
  constructor(config) {
    this.config = config;
  }

  /**
   * Restaure le dump et renomme les schémas avec le suffixe de couleur
   * @param {string} filePath - Chemin vers le fichier dump
   * @param {string} targetColor - 'blue' ou 'green'
   */
  async restoreDatabase(filePath, targetColor) {
    if (!targetColor || !['blue', 'green'].includes(targetColor)) {
      throw new Error('targetColor must be "blue" or "green"');
    }

    console.log(`Starting database restore from ${filePath}...`);

    const { connectionString } = this.config.pg;

    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }

    console.log('Using DATABASE_URL for connection.');
    console.log(`Target color: ${targetColor}`);

    // Étape 1 : Supprimer les schémas standards s'ils existent (pour que pg_restore puisse les créer)
    console.log(`Dropping standard schemas if they exist...`);
    await this._dropStandardSchemas(connectionString);

    // Étape 2 : Restaurer le dump normalement (crée custom_ingestion_roseau et custom_ingestion_lanceleau)
    console.log(`Restoring dump...`);
    await this._restoreDump(filePath, connectionString);

    // Étape 3 : Renommer les schémas avec le suffixe de couleur
    console.log(`Renaming schemas to ${targetColor}...`);
    await this._renameSchemasToColor(targetColor, connectionString);

    console.log('Database restore completed successfully.');
  }

  async _dropStandardSchemas(connectionString) {
    const env = { ...process.env };

    const sql = `
      DROP SCHEMA IF EXISTS custom_ingestion_roseau CASCADE;
      DROP SCHEMA IF EXISTS custom_ingestion_lanceleau CASCADE;
      DROP SCHEMA IF EXISTS custom_ingestion_verseau CASCADE;
      CREATE SCHEMA custom_ingestion_roseau;
      CREATE SCHEMA custom_ingestion_lanceleau;
      CREATE SCHEMA custom_ingestion_verseau;
    `;

    return new Promise((resolve, reject) => {
      const args = ['-d', connectionString, '-c', sql];
      const psqlProcess = spawn('psql', args, { env });

      psqlProcess.stderr.on('data', (data) => {
        console.log(`  ${data}`);
      });

      psqlProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Standard schemas recreated.`);
          resolve();
        } else {
          reject(new Error(`Failed to recreate schemas (exit code ${code})`));
        }
      });

      psqlProcess.on('error', (err) => reject(err));
    });
  }

  async _restoreDump(filePath, connectionString) {
    const env = { ...process.env };

    const args = [
      '--verbose',
      '--no-owner',
      '--no-acl',
      '--schema=custom_ingestion_roseau',
      '--schema=custom_ingestion_lanceleau',
      '--schema=custom_ingestion_verseau',
      '-d',
      connectionString,
      filePath,
    ];

    return new Promise((resolve, reject) => {
      const restoreProcess = spawn('pg_restore', args, { env });

      let stderr = '';

      restoreProcess.stdout.on('data', (data) => {
        console.log(`pg_restore: ${data}`);
      });

      restoreProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`pg_restore: ${data}`);
      });

      restoreProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dump restored successfully.');
          resolve();
        } else {
          console.error('pg_restore stderr:', stderr);
          reject(new Error(`pg_restore exited with code ${code}`));
        }
      });

      restoreProcess.on('error', (err) => reject(err));
    });
  }

  async _renameSchemasToColor(targetColor, connectionString) {
    const env = { ...process.env };

    const sql = `
      DROP SCHEMA IF EXISTS custom_ingestion_roseau_${targetColor} CASCADE;
      DROP SCHEMA IF EXISTS custom_ingestion_lanceleau_${targetColor} CASCADE;
      DROP SCHEMA IF EXISTS custom_ingestion_verseau_${targetColor} CASCADE;
      ALTER SCHEMA custom_ingestion_roseau RENAME TO custom_ingestion_roseau_${targetColor};
      ALTER SCHEMA custom_ingestion_lanceleau RENAME TO custom_ingestion_lanceleau_${targetColor};
      ALTER SCHEMA custom_ingestion_verseau RENAME TO custom_ingestion_verseau_${targetColor};
    `;

    return new Promise((resolve, reject) => {
      const args = ['-d', connectionString, '-c', sql];
      const psqlProcess = spawn('psql', args, { env });

      psqlProcess.stderr.on('data', (data) => {
        console.log(`  ${data}`);
      });

      psqlProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Schemas renamed to ${targetColor} successfully.`);
          resolve();
        } else {
          reject(new Error(`Failed to rename schemas (exit code ${code})`));
        }
      });

      psqlProcess.on('error', (err) => reject(err));
    });
  }
}

module.exports = PgService;
