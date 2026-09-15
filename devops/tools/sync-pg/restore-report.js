const { loadTchapConfig, loadLogsUrl } = require('./tchap-config');

async function createReport(error) {
  const lines = [`Bilan de restauration PostgreSQL : ${error === undefined ? 'RÉUSSIE' : 'ERREUR'}`];
  if (error !== undefined) {
    lines.push(`Erreur : ${error}`);
  }

  lines.push('', 'Fraîcheur actuelle de la base :');
  try {
    const { RestoreReportRepository } = require('./restore-report.repository');
    const freshness = await new RestoreReportRepository(require('./config')).collectFreshness();
    for (const item of freshness) {
      lines.push(`- ${item.source}`);
      lines.push(`  UTC : ${item.latestUtc ?? 'valeur nulle'}`);
      lines.push(`  Europe/Paris : ${item.latestParis ?? 'valeur nulle'}`);
    }
  } catch {
    lines.push('- fraîcheur indisponible');
  }

  const logsUrl = loadLogsUrl();
  if (logsUrl) {
    lines.push('', `Logs : ${logsUrl}`);
  }
  return lines.join('\n');
}

async function sendReport(error) {
  try {
    const tchapConfig = loadTchapConfig();
    if (!tchapConfig.enabled) return;

    const message = await createReport(error);
    const { TchapService } = require('./tchap-service');
    await new TchapService(tchapConfig).sendText(message);
  } catch {
    console.warn('Échec de l’envoi du bilan Tchap.');
  }
}

module.exports = { createReport, sendReport };
