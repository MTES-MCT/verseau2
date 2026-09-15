const fs = require('fs');
const path = require('path');
const { Client, types } = require('pg');

const TIMESTAMP_WITHOUT_TIME_ZONE_OID = 1114;
const freshnessSql = fs.readFileSync(path.join(__dirname, 'restore-report.sql'), 'utf8');

function databaseTypes() {
  return {
    getTypeParser(oid, format) {
      if (oid === TIMESTAMP_WITHOUT_TIME_ZONE_OID) {
        return (value) => value;
      }
      return types.getTypeParser(oid, format);
    },
  };
}

function formatUtc(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function formatParis(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return `${String(value).replace('T', ' ')} Europe/Paris`;
}

class RestoreReportRepository {
  constructor(config) {
    this.connectionString = config.pg.connectionString;
  }

  async _getClient() {
    const client = new Client({
      connectionString: this.connectionString,
      options: '-c timezone=UTC',
      types: databaseTypes(),
    });
    await client.connect();
    return client;
  }

  async collectFreshness() {
    const client = await this._getClient();
    try {
      const result = await client.query(freshnessSql);
      return result.rows.map((row) => ({
        source: row.source,
        latestUtc: formatUtc(row.latest_utc),
        latestParis: formatParis(row.latest_paris),
      }));
    } finally {
      await client.end();
    }
  }
}

module.exports = { RestoreReportRepository };
