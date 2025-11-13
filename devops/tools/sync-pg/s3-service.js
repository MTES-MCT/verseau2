const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const { pipeline } = require('stream/promises');

class S3Service {
  constructor(config) {
    this.config = config;
    this.client = new S3Client({
      region: config.aws.region,
      endpoint: config.aws.endpoint,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async getMostRecentKey() {
    console.log(`Listing objects in bucket ${this.config.aws.bucket} with prefix ${this.config.aws.dumpFolder || '(none)'}...`);
    const command = new ListObjectsV2Command({
      Bucket: this.config.aws.bucket,
      Prefix: this.config.aws.dumpFolder,
    });

    try {
      const response = await this.client.send(command);
      if (!response.Contents || response.Contents.length === 0) {
        throw new Error(`No files found in bucket ${this.config.aws.bucket}`);
      }

      const sortedFiles = response.Contents.sort((a, b) => b.LastModified - a.LastModified);
      const mostRecentFile = sortedFiles[0];
      
      console.log(`Found most recent file: ${mostRecentFile.Key} (Last Modified: ${mostRecentFile.LastModified})`);
      return mostRecentFile.Key;
    } catch (error) {
      console.error('Error listing objects from S3:', error);
      throw error;
    }
  }

  async downloadFile() {
    const key = await this.getMostRecentKey();
    console.log(`Starting download from s3://${this.config.aws.bucket}/${key}`);
    
    const command = new GetObjectCommand({
      Bucket: this.config.aws.bucket,
      Key: key,
    });

    try {
      const response = await this.client.send(command);
      const localPath = `./${require('path').basename(key)}`;
      await pipeline(response.Body, fs.createWriteStream(localPath));
      console.log(`Download completed successfully: ${localPath}`);
      return localPath;
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      throw error;
    }
  }
}

module.exports = S3Service;
