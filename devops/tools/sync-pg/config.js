const fs = require('fs');
const path = require('path');

if(process.env.NODE_ENV === 'development') {
  if (fs.existsSync(path.resolve(__dirname, '.env.local'))) {
    require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });
  }
}


module.exports = {
  aws: {
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET,
    dumpFolder: process.env.S3_DUMP_FOLDER,
    endpoint: process.env.S3_ENDPOINT,
  },
  pg: {
    connectionString: process.env.DATABASE_URL,
  },
};
