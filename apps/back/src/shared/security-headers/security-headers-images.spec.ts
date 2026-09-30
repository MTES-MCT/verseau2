import { buildSpaContentSecurityPolicy } from './security-headers';

// Ressources réellement utilisées par apps/front/src/components/Footer.tsx.
const FOOTER_LOGO_URLS = [
  'https://assainissement.developpement-durable.gouv.fr/favicon/partenaires/Logo_eaufrance.svg',
  'https://assainissement.developpement-durable.gouv.fr/favicon/partenaires/logo-2x.png',
  'https://assainissement.developpement-durable.gouv.fr/favicon/partenaires/logo-ofb1.png',
  'https://assainissement.developpement-durable.gouv.fr/favicon/partenaires/logo_agences.png',
];

describe('buildSpaContentSecurityPolicy - images du SPA', () => {
  const imageSources = buildSpaContentSecurityPolicy()
    .split('; ')
    .find((directive) => directive.startsWith('img-src '))
    ?.split(' ')
    .slice(1);

  it.each(FOOTER_LOGO_URLS)('autorise le logo du footer %s', (logoUrl) => {
    expect(imageSources).toContain(new URL(logoUrl).origin);
  });

  it("n'autorise que les images locales, les données DSFR et l'origine HTTPS exacte des logos, sans wildcard", () => {
    expect(imageSources).toEqual(["'self'", 'data:', 'https://assainissement.developpement-durable.gouv.fr']);
  });
});
