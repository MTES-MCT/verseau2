const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

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

        // Human-readable byte formatter
  formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return 'unknown';      
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  async downloadFile() {
    const key = await this.getMostRecentKey();
    console.log(`Starting download from s3://${this.config.aws.bucket}/${key}`);
    
    const command = new GetObjectCommand({
      Bucket: this.config.aws.bucket,
      Key: key,
    });

    try {
      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('S3 getObject response has no Body');
      }

      const localPath = `./${require('path').basename(key)}`;

      // Total size in bytes if available
      const totalBytes = typeof response.ContentLength === 'number' ? response.ContentLength : undefined;
      const formatBytes = this.formatBytes.bind(this);

      let bytesDownloaded = 0;
      let lastLoggedPercent = 0; // start at 0 so we log from 1%

      // Transform stream that counts bytes and logs progress every 5%
      const progressStream = new Transform({
        transform(chunk, encoding, callback) {
          try {
            bytesDownloaded += chunk.length;

            if (totalBytes) {
              const percent = Math.floor((bytesDownloaded / totalBytes) * 100);
              if (percent >= lastLoggedPercent + 5) {
                lastLoggedPercent = percent;
                console.log(`Download progress: ${percent}% (${formatBytes(bytesDownloaded)} / ${formatBytes(totalBytes)})`);
              }
            } else {
              // Fallback when total size is unknown: log every 100 MB
              const MB100 = 100 * 1024 * 1024;
              if (!this._lastLoggedBytes) this._lastLoggedBytes = 0;
              if (bytesDownloaded - this._lastLoggedBytes >= MB100) {
                this._lastLoggedBytes = bytesDownloaded;
                console.log(`Download progress: ${formatBytes(bytesDownloaded)} downloaded`);
              }
            }

            callback(null, chunk);
          } catch (err) {
            callback(err);
          }
        }
      });

      await pipeline(response.Body, progressStream, fs.createWriteStream(localPath));

      // Ensure we log 100% if total was known but final chunk didn't hit 100 exactly
      if (totalBytes && lastLoggedPercent < 100) {
        console.log(`Download progress: 100% (${formatBytes(totalBytes)} / ${formatBytes(totalBytes)})`);
      }

      console.log(`Download completed successfully: ${localPath}`);
      return localPath;
    } catch (error) {
      console.error('Error downloading file from S3:', error);
      throw error;
    }
  }
}

module.exports = S3Service;
