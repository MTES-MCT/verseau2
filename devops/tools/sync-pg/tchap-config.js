const REQUIRED_VARIABLES = [
  'TCHAP_HOMESERVER_URL',
  'TCHAP_ACCESS_TOKEN',
  'TCHAP_ROOM_ID',
  'TCHAP_USER_ID',
];

function isMatrixIdentifier(value, sigil) {
  return typeof value === 'string' && value.startsWith(sigil) && /^.[^:\s]+:[^\s]+$/.test(value);
}

function loadLogsUrl(env = process.env, logger = console) {
  const value = env.SYNC_PG_LOGS_URL?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || /[\r\n]/.test(value)) {
      throw new Error('Invalid logs URL');
    }
    return url.href;
  } catch {
    logger.warn('SYNC_PG_LOGS_URL invalide : lien vers les logs omis.');
    return undefined;
  }
}

function loadTchapConfig(env = process.env, logger = console) {
  const values = Object.fromEntries(REQUIRED_VARIABLES.map((name) => [name, env[name]?.trim()]));
  const configuredVariables = REQUIRED_VARIABLES.filter((name) => values[name]);

  if (configuredVariables.length === 0) {
    const reason = 'Notifications Tchap désactivées : aucune variable TCHAP_* n’est configurée.';
    logger.warn(reason);
    return { enabled: false, reason };
  }

  const errors = [];
  const missingVariables = REQUIRED_VARIABLES.filter((name) => !values[name]);
  if (missingVariables.length > 0) {
    errors.push(`variables manquantes : ${missingVariables.join(', ')}`);
  }

  if (values.TCHAP_HOMESERVER_URL) {
    try {
      const url = new URL(values.TCHAP_HOMESERVER_URL);
      if (url.protocol !== 'https:') {
        errors.push('TCHAP_HOMESERVER_URL doit utiliser HTTPS');
      }
    } catch {
      errors.push('TCHAP_HOMESERVER_URL doit être une URL valide');
    }
  }

  if (values.TCHAP_ROOM_ID && !isMatrixIdentifier(values.TCHAP_ROOM_ID, '!')) {
    errors.push('TCHAP_ROOM_ID doit être un identifiant Matrix complet au format !…:…');
  }
  if (values.TCHAP_USER_ID && !isMatrixIdentifier(values.TCHAP_USER_ID, '@')) {
    errors.push('TCHAP_USER_ID doit être un identifiant Matrix complet au format @…:…');
  }

  if (errors.length > 0) {
    const reason = `Notifications Tchap désactivées : configuration invalide (${errors.join(' ; ')}).`;
    logger.warn(reason);
    return { enabled: false, reason };
  }

  return {
    enabled: true,
    homeserverUrl: values.TCHAP_HOMESERVER_URL,
    accessToken: values.TCHAP_ACCESS_TOKEN,
    roomId: values.TCHAP_ROOM_ID,
    userId: values.TCHAP_USER_ID,
  };
}

module.exports = { REQUIRED_VARIABLES, loadTchapConfig, loadLogsUrl };
