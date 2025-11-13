const { spawn } = require("child_process");

class PgService {
  constructor(config) {
    this.config = config;
  }

  async createSchema() {
    console.log(
      "Creating schemas custom_ingestion_roseau and custom_ingestion_lanceleau..."
    );

    const { connectionString } = this.config.pg;

    const env = { ...process.env };
    const dbTarget = connectionString;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }

    console.log("Using DATABASE_URL for connection.");

    const sql = `
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE SCHEMA IF NOT EXISTS custom_ingestion_roseau;
      CREATE SCHEMA IF NOT EXISTS custom_ingestion_lanceleau;
    `;

    const args = ["-d", dbTarget, "-c", sql];

    return new Promise((resolve, reject) => {
      const psqlProcess = spawn("psql", args, { env });

      psqlProcess.stdout.on("data", (data) => {
        console.log(`psql: ${data}`);
      });

      psqlProcess.stderr.on("data", (data) => {
        console.error(`psql: ${data}`);
      });

      psqlProcess.on("close", (code) => {
        if (code === 0) {
          console.log("Schemas created successfully.");
          resolve();
        } else {
          console.error(`psql exited with code ${code}`);
          reject(new Error(`psql exited with code ${code}`));
        }
      });

      psqlProcess.on("error", (err) => {
        console.error("Failed to start psql:", err);
        reject(err);
      });
    });
  }

  async restoreDatabase(filePath) {
    console.log(`Starting database restore from ${filePath}...`);

    const { connectionString } = this.config.pg;

    const env = { ...process.env };
    const dbTarget = connectionString;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }

    console.log("Using DATABASE_URL for connection.");

    const args = [
      "--clean",
      "--if-exists",
      "--verbose",
      "--no-owner",
      "--no-acl",
      "-d",
      dbTarget,
      filePath,
    ];

    return new Promise((resolve, reject) => {
      const restoreProcess = spawn("pg_restore", args, { env });

      restoreProcess.stdout.on("data", (data) => {
        console.log(`pg_restore: ${data}`);
      });

      restoreProcess.stderr.on("data", (data) => {
        console.error(`pg_restore: ${data}`);
      });

      restoreProcess.on("close", (code) => {
        if (code === 0) {
          console.log("Database restore completed successfully.");
          resolve();
        } else {
          console.error(`pg_restore exited with code ${code}`);
          reject(new Error(`pg_restore exited with code ${code}`));
        }
      });

      restoreProcess.on("error", (err) => {
        console.error("Failed to start pg_restore:", err);
        reject(err);
      });
    });
  }
}

module.exports = PgService;
