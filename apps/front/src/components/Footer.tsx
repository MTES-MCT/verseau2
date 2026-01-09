import { Footer } from '@codegouvfr/react-dsfr/Footer';

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
      accessibility="non compliant"
      contentDescription="Le portail sur l'assainissement collectif est propulsé par la direction de l'eau et de la biodiversité. Le code source est disponible en licence libre."
      partnersLogos={{
        sub: [
          {
            alt: 'EAU-FRANCE',
            imgUrl: 'https://assainissement.developpement-durable.gouv.fr/favicon/partenaires/Logo_eaufrance.svg',
            linkProps: {
              href: 'https://www.eaufrance.fr/',
              title: 'EAU-FRANCE',
            },
          },
          {
            alt: 'OIEAU',
            imgUrl: 'https://assainissement.developpement-durable.gouv.fr/favicon/partenaires/logo-2x.png',
            linkProps: {
              href: 'https://oieau.fr/',
              title: 'OIEAU',
            },
          },
          {
            alt: 'OFB',
            imgUrl: 'https://assainissement.developpement-durable.gouv.fr/favicon/partenaires/logo-ofb1.png',
            linkProps: {
              href: 'https://ofb.gouv.fr/',
              title: 'OFB',
            },
          },
          {
            alt: "Agence de l'eau",
            imgUrl: 'https://assainissement.developpement-durable.gouv.fr/favicon/partenaires/logo_agences.png',
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
