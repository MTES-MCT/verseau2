const normalizeBasePath = (basePath: string | undefined) => {
  if (!basePath || basePath === '/') {
    return '/';
  }

  return `/${basePath.replace(/^\/+|\/+$/g, '')}`;
};

export const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL);
export const APP_HOME_PATH = APP_BASE_PATH === '/' ? '/' : `${APP_BASE_PATH}/`;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000/api' : `${APP_BASE_PATH === '/' ? '' : APP_BASE_PATH}/api`);
