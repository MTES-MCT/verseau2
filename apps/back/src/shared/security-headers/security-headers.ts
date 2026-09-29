import type { NextFunction, Request, Response } from 'express';

/**
 * En-têtes de sécurité appliqués globalement (voir mainServer.ts).
 *
 * Ce middleware maison a été préféré à helmet : le jeu d'en-têtes est petit,
 * stable et doit distinguer les réponses API des réponses du SPA, sans
 * nécessiter les mécanismes de nonce ni les dépendances supplémentaires.
 */

/** HSTS sur un an, sous-domaines inclus. Émis uniquement sur les requêtes https. */
const HSTS_VALUE = 'max-age=31536000; includeSubDomains';

/**
 * CSP des réponses API (préfixe global /api) : JSON et téléchargements forcés
 * (`attachment` + `application/xml`). Aucune ressource n'a besoin d'être
 * chargée par ces réponses → directives les plus restrictives possibles.
 * `frame-ancestors 'none'` interdit tout framing, y compris same-site
 * (le portail beta.gouv.fr partage le site et contourne la défense SameSite).
 */
const API_CSP = "default-src 'none'; frame-ancestors 'none'";

const PERMISSIONS_POLICY = 'camera=(), microphone=(), geolocation=()';
const REFERRER_POLICY = 'strict-origin-when-cross-origin';

export interface SecurityHeadersOptions {
  /**
   * Origines supplémentaires autorisées par `connect-src` pour le SPA
   * (ex. l'hôte d'ingestion Sentry, intégré au build du front mais inconnu
   * du backend). N'affecte pas la CSP de l'API.
   */
  extraConnectOrigins?: string[];
}

/**
 * CSP du SPA, validée par inspection statique du build (apps/front/dist) :
 * - `script-src 'self'` : un seul module externe (assets/index-*.js), aucun
 *   script inline dans index.html ni `eval` dans les bundles ;
 * - `style-src 'unsafe-inline'` : le DSFR et l'app posent des styles inline
 *   (ex. TableLoader.tsx contient un élément <style>) ;
 * - `img-src 'self' data:` : les CSS DSFR embarquent des icônes data:image/svg+xml ;
 * - `font-src 'self'` : polices Marianne/Spectral servies depuis assets/ ;
 * - `connect-src 'self'` (+ origines configurables) : appels API même origine
 *   et éventuel hôte Sentry ;
 * - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` : aucun plugin,
 *   aucune balise <base>, aucune soumission de formulaire externe (la
 *   redirection OIDC est une navigation JS, pas un POST de formulaire) ;
 * - `frame-ancestors 'none'` : interdit tout framing, même same-site
 *   (contrefaçon de clic / vol de session par le portail partagé beta.gouv.fr).
 */
export const buildSpaContentSecurityPolicy = (extraConnectOrigins: string[] = []): string => {
  const connectSrc = ["'self'", ...extraConnectOrigins.filter(Boolean)].join(' ');
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
};

/**
 * Parse la variable d'environnement CSP_EXTRA_CONNECT_SRC : origines séparées
 * par des virgules ou des espaces (ex. "https://sentry.incubateur.net").
 */
export const parseExtraConnectOrigins = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(/[,\s]+/)
    .map((origin) => origin.trim())
    .filter(Boolean);

const isApiPath = (path: string): boolean => /^\/api(?:\/|$)/.test(path);

/**
 * Requête vue comme https : soit la connexion directe est TLS (req.secure,
 * qui tient compte de trust proxy), soit la terminaison TLS amont
 * (Scalingo / nginx) l'indique via x-forwarded-proto (première valeur de la
 * chaîne de proxies).
 */
const isHttpsRequest = (req: Request): boolean => {
  if (req.secure) {
    return true;
  }
  const forwardedProto = req.headers['x-forwarded-proto'];
  const firstProto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto?.split(',')[0];
  return firstProto?.trim().toLowerCase() === 'https';
};

/**
 * Crée le middleware Express qui applique les en-têtes de sécurité à toutes
 * les réponses (API, SPA servi par ServeStatic, erreurs 404). À enregistrer
 * avant `app.init()`/`app.listen()` pour passer devant les middlewares
 * ServeStatic enregistrés à l'initialisation des modules.
 */
export const createSecurityHeadersMiddleware = (options: SecurityHeadersOptions = {}) => {
  const spaCsp = buildSpaContentSecurityPolicy(options.extraConnectOrigins);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Empêche le reniflement de type MIME ; complète les téléchargements forcés
    // (attachment + application/xml) des dépôts ré-servis par l'API.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Interdit le framing pour les navigateurs sans support de CSP
    // frame-ancestors (la CSP ajoute la même interdiction pour les autres).
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', isApiPath(req.path) ? API_CSP : spaCsp);
    // N'envoie l'URL complète qu'en same-origin ; les requêtes cross-origin
    // ne fuient que l'origine.
    res.setHeader('Referrer-Policy', REFERRER_POLICY);
    // Aucune de ces fonctionnalités n'est utilisée par l'app.
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    // HSTS uniquement sur les requêtes https pour ne pas impacter le dev local.
    if (isHttpsRequest(req)) {
      res.setHeader('Strict-Transport-Security', HSTS_VALUE);
    }
    next();
  };
};
