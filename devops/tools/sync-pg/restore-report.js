const { loadTchapConfig, loadEnvironment, loadLogsUrl } = require('./tchap-config');

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function createReport({ error, fileName, excludedTables, durationMs }) {
  const lines = [`Bilan de restauration PostgreSQL : ${error === undefined ? 'RÉUSSIE' : 'ERREUR'}`];
  const environment = loadEnvironment();
  if (environment) {
    lines.push(`Environnement : ${environment.isProduction ? 'PRODUCTION' : environment.label}`);
  }
  if (error !== undefined) {
    lines.push(`Erreur : ${error}`);
  }

  const seconds = Math.floor(durationMs / 1000);
  lines.push('', `Fichier du dump : ${fileName ?? 'indisponible'}`);
  lines.push(`Durée du traitement : ${Math.floor(seconds / 3600)} h ${Math.floor((seconds % 3600) / 60)} min ${seconds % 60} s`);
  lines.push('Tables exclues configurées :');
  lines.push(...(excludedTables.length ? excludedTables.map((table) => `- ${table}`) : ['- aucune']));

  lines.push('', 'Fraîcheur actuelle de la base :');
  try {
    const { RestoreReportRepository } = require('./restore-report.repository');
    const freshness = await new RestoreReportRepository(require('./config')).collectFreshness();
    for (const item of freshness) {
      lines.push(`- ${item.latestParis?.slice(0, 10) ?? 'valeur nulle'} : ${item.source}`);
    }
  } catch {
    lines.push('- fraîcheur indisponible');
  }

  const logsUrl = loadLogsUrl();
  if (logsUrl) {
    lines.push('', `Logs : ${logsUrl}`);
  }

  const text = lines.join('\n');
  if (!environment?.isProduction) {
    return { text };
  }

  const environmentLineIndex = 1;
  const html = lines
    .map((line, index) => (index === environmentLineIndex ? 'Environnement : <strong>PRODUCTION</strong>' : escapeHtml(line)))
    .join('<br>');
  return { text, html };
}

async function sendReport(report) {
  try {
    const tchapConfig = loadTchapConfig();
    if (!tchapConfig.enabled) return;

    const { text, html } = await createReport(report);
    const { TchapService } = require('./tchap-service');
    await new TchapService(tchapConfig).sendText(text, html);
  } catch (error) {
    console.error('Échec de l’envoi du bilan Tchap :', error);
  }
}

module.exports = { createReport, sendReport };
