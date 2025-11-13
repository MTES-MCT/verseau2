const fs = require("fs");
const config = require("./config");
const S3Service = require("./s3-service");
const PgService = require("./pg-service");
require("./server");

async function main() {
  try {
    if (!config.aws.bucket) {
      throw new Error("Missing S3 configuration. Please check .env file.");
    }
    if (!config.pg.database && !config.pg.connectionString) {
      throw new Error(
        "Missing Postgres configuration. Please check .env file."
      );
    }

    const s3Service = new S3Service(config);
    const pgService = new PgService(config);

    const tempFilePath = await s3Service.downloadFile();
    console.log("Downloaded file:", tempFilePath);
    await pgService.createSchema();
    await pgService.restoreDatabase(tempFilePath);

    console.log("Cleaning up temporary file...");
    fs.unlinkSync(tempFilePath);
    console.log("Cleanup done.");

    console.log("Sync process finished successfully.");
  } catch (error) {
    console.error("Sync process failed:", error);
    process.exit(1);
  }
}

main();
