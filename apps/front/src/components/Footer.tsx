import { Footer } from '@codegouvfr/react-dsfr/Footer';
import { AppRoutes } from '../routes';

export function AppFooter() {
  return (
    <Footer
      brandTop={
        <span style={{ textAlign: 'left', display: 'block' }}>
          MINISTÈRE
          <br />
          DE LA TRANSITION
          <br />
          ÉCOLOGIQUE,
          <br />
          DE LA BIODIVERSITÉ
          <br />
          ET DES NÉGOCIATIONS
          <br />
          INTERNATIONALES
          <br />
          SUR LE CLIMAT ET LA NATURE
        </span>
      }
      homeLinkProps={{ href: AppRoutes.HOME, title: 'Accueil' }}
      accessibility="non compliant"
      accessibilityLinkProps={{ href: AppRoutes.ACCESSIBILITY }}
      contentDescription="VERSEAU2 est propulsé par la direction de l'eau et de la biodiversité. Le code source est disponible en licence libre."
      partnersLogos={{
        sub: [
          {
            alt: 'EAU-FRANCE',
            imgUrl: `${import.meta.env.BASE_URL}favicon/partenaires/logo-eaufrance.png`,
            linkProps: {
              href: 'https://www.eaufrance.fr/',
              title: 'EAU-FRANCE',
            },
          },
          {
            alt: 'OIEAU',
            imgUrl: `${import.meta.env.BASE_URL}favicon/partenaires/logo-oieau.png`,
            linkProps: {
              href: 'https://oieau.fr/',
              title: 'OIEAU',
            },
          },
          {
            alt: 'OFB',
            imgUrl: `${import.meta.env.BASE_URL}favicon/partenaires/logo-ofb.jpg`,
            linkProps: {
              href: 'https://ofb.gouv.fr/',
              title: 'OFB',
            },
          },
          {
            alt: "Agence de l'eau",
            imgUrl: `${import.meta.env.BASE_URL}favicon/partenaires/logo-agences.png`,
            linkProps: {
              href: 'http://www.lesagencesdeleau.fr/',
              title: "Agence de l'eau",
            },
          },
        ],
      }}
    />
  );
}
