export function getEnvironmentLabel(appEnvironment: string | undefined): string | undefined {
  const environment = appEnvironment?.trim();
  const normalizedEnvironment = environment?.toLowerCase();

  if (!environment || normalizedEnvironment === 'production' || normalizedEnvironment === 'prod') {
    return undefined;
  }

  const isDevelopment = normalizedEnvironment === 'development' || normalizedEnvironment === 'dev';

  return isDevelopment ? 'Développement' : environment;
}
