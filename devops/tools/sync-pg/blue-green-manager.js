const { Client } = require('pg');

/**
 * Gère la stratégie Blue-Green pour les schémas de référentiels.
 *
 * Workflow simplifié :
 * 1. Le dump est restauré normalement (crée custom_ingestion_roseau et custom_ingestion_lanceleau)
 * 2. Les schémas sont renommés avec le suffixe _blue ou _green
 * 3. Les vues roseau et lanceleau pointent vers le schéma coloré actif
 * 4. L'ancien schéma coloré est supprimé
 */
class BlueGreenSchemaManager {
  constructor(config) {
    this.config = config;
  }

  /**
   * Crée un client PostgreSQL pour exécuter des requêtes
   */
  async _getClient() {
    const client = new Client({
      connectionString: this.config.pg.connectionString,
    });
    await client.connect();
    return client;
  }

  /**
   * Récupère dynamiquement la liste des tables d'un schéma
   * @param {Client} client - Client PostgreSQL déjà connecté
   * @param {string} schemaName - Nom du schéma
   * @returns {Promise<string[]>} Liste des noms de tables
   */
  async _getTablesFromSchema(client, schemaName) {
    const result = await client.query(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `,
      [schemaName],
    );

    return result.rows.map((row) => row.table_name);
  }

  /**
   * Détermine quelle couleur (blue ou green) est actuellement active
   * @returns {Promise<string|null>} 'blue', 'green' ou null si pas encore initialisé
   */
  async getCurrentActiveColor() {
    const client = await this._getClient();

    try {
      // Vérifie si la table de tracking existe
      const trackingExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename = 'blue_green_tracking'
        );
      `);

      if (!trackingExists.rows[0].exists) {
        console.log('Table de tracking non trouvée.');
        return null;
      }

      // Récupère la couleur active
      const result = await client.query(`
        SELECT active_color 
        FROM public.blue_green_tracking 
        WHERE schema_name = 'custom_ingestion_roseau' 
        LIMIT 1;
      `);

      if (result.rows.length === 0) {
        console.log('Aucune couleur active trouvée.');
        return null;
      }

      const activeColor = result.rows[0].active_color;
      console.log(`Couleur active actuelle : ${activeColor}`);
      return activeColor;
    } finally {
      await client.end();
    }
  }

  /**
   * Retourne la couleur cible pour la prochaine restauration
   * @returns {Promise<string>} 'blue' ou 'green'
   */
  async getTargetColor() {
    const activeColor = await this.getCurrentActiveColor();

    if (activeColor === null) {
      // Première initialisation : on commence avec blue
      return 'blue';
    }

    // Alterner entre blue et green
    return activeColor === 'blue' ? 'green' : 'blue';
  }

  /**
   * Valide qu'un schéma contient des tables
   * @param {string} color - 'blue' ou 'green'
   * @throws {Error} Si la validation échoue
   */
  async validateSchema(color) {
    console.log(`Validation des schémas ${color}...`);
    const client = await this._getClient();

    try {
      const roseauSchema = `custom_ingestion_roseau_${color}`;
      const lanceleauSchema = `custom_ingestion_lanceleau_${color}`;

      // Valider Roseau
      const roseauTables = await this._getTablesFromSchema(client, roseauSchema);
      if (roseauTables.length === 0) {
        throw new Error(`Le schéma ${roseauSchema} ne contient aucune table !`);
      }

      for (const table of roseauTables) {
        const result = await client.query(`
          SELECT COUNT(*) as count 
          FROM ${roseauSchema}.${table};
        `);
        const count = parseInt(result.rows[0].count);
        console.log(`  ${roseauSchema}.${table}: ${count} lignes`);
      }

      // Valider Lanceleau
      const lanceleauTables = await this._getTablesFromSchema(client, lanceleauSchema);
      if (lanceleauTables.length === 0) {
        throw new Error(`Le schéma ${lanceleauSchema} ne contient aucune table !`);
      }

      for (const table of lanceleauTables) {
        const result = await client.query(`
          SELECT COUNT(*) as count 
          FROM ${lanceleauSchema}.${table};
        `);
        const count = parseInt(result.rows[0].count);
        console.log(`  ${lanceleauSchema}.${table}: ${count} lignes`);
      }

      console.log(
        `✅ Validation des schémas ${color} réussie (${roseauTables.length} tables Roseau, ${lanceleauTables.length} tables Lanceleau).`,
      );
    } finally {
      await client.end();
    }
  }

  /**
   * Crée ou met à jour les vues pointant vers le schéma coloré
   * @param {string} color - 'blue' ou 'green'
   */
  async switchToColor(color) {
    console.log(`Création/mise à jour des vues vers la couleur ${color}...`);
    const client = await this._getClient();

    try {
      await client.query('BEGIN');

      // Créer la table de tracking si elle n'existe pas
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.blue_green_tracking (
          schema_name VARCHAR(255) PRIMARY KEY,
          active_color VARCHAR(10) NOT NULL CHECK (active_color IN ('blue', 'green')),
          switched_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      // Créer les schémas de vues s'ils n'existent pas
      await client.query(`CREATE SCHEMA IF NOT EXISTS roseau;`);
      await client.query(`CREATE SCHEMA IF NOT EXISTS lanceleau;`);

      // Récupérer les tables du schéma coloré
      const roseauSourceSchema = `custom_ingestion_roseau_${color}`;
      const lanceleauSourceSchema = `custom_ingestion_lanceleau_${color}`;

      const roseauTables = await this._getTablesFromSchema(client, roseauSourceSchema);
      const lanceleauTables = await this._getTablesFromSchema(client, lanceleauSourceSchema);

      // Créer/recréer les vues pour Roseau
      for (const table of roseauTables) {
        await client.query(`DROP VIEW IF EXISTS roseau.${table} CASCADE;`);
        await client.query(`
          CREATE VIEW roseau.${table} AS 
          SELECT * FROM ${roseauSourceSchema}.${table};
        `);
      }

      // Créer/recréer les vues pour Lanceleau
      for (const table of lanceleauTables) {
        await client.query(`DROP VIEW IF EXISTS lanceleau.${table} CASCADE;`);
        await client.query(`
          CREATE VIEW lanceleau.${table} AS 
          SELECT * FROM ${lanceleauSourceSchema}.${table};
        `);
      }

      // Mettre à jour le tracking
      await client.query(
        `
        INSERT INTO public.blue_green_tracking (schema_name, active_color, switched_at)
        VALUES 
          ('custom_ingestion_roseau', $1, NOW()),
          ('custom_ingestion_lanceleau', $1, NOW())
        ON CONFLICT (schema_name) 
        DO UPDATE SET 
          active_color = EXCLUDED.active_color,
          switched_at = EXCLUDED.switched_at;
      `,
        [color],
      );

      await client.query('COMMIT');

      console.log(
        `✅ Vues mises à jour vers ${color} (${roseauTables.length} vues Roseau, ${lanceleauTables.length} vues Lanceleau).`,
      );
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Erreur lors de la mise à jour des vues vers ${color}:`, error);
      throw error;
    } finally {
      await client.end();
    }
  }

  /**
   * Supprime le schéma coloré inactif
   * @param {string} color - 'blue' ou 'green' - la couleur à supprimer
   */
  async cleanupOldSchema(color) {
    console.log(`Suppression de l'ancien schéma ${color}...`);
    const client = await this._getClient();

    try {
      const roseauSchema = `custom_ingestion_roseau_${color}`;
      const lanceleauSchema = `custom_ingestion_lanceleau_${color}`;

      await client.query(`DROP SCHEMA IF EXISTS ${roseauSchema} CASCADE;`);
      await client.query(`DROP SCHEMA IF EXISTS ${lanceleauSchema} CASCADE;`);

      console.log(`✅ Schémas ${roseauSchema} et ${lanceleauSchema} supprimés.`);
    } catch (error) {
      console.error(`⚠️ Erreur lors du nettoyage du schéma ${color}:`, error);
      // Ne pas propager l'erreur, le nettoyage n'est pas critique
    } finally {
      await client.end();
    }
  }
}

module.exports = BlueGreenSchemaManager;
