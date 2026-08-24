import { formatAgentVerseauReport } from './agentVerseauReportFormatter';

describe('formatAgentVerseauReport', () => {
  it('formats Agent Verseau HTML and repairs mixed mojibake', () => {
    const report =
      "<p>**<br/>IMPORTANT : ne rÃ©pondez pas Ã  l'expÃ©diteur de ce message, il s'agit d'un automate.<br/>**<br/></p>" +
      '<p>Bonjour,<br/></p>' +
      "<p>Le dÃ©pÃ´t automatique du fichier n'a pas pu Ãªtre effectuÃ© pour les raisons suivantes :<br/>" +
      " - Vous n'êtes pas déclaré en tant que déposant pour l'ouvrage référencé : 0485024S0001.<br/></p>" +
      '<p>Pour toute question ou en cas de problÃ¨me vous pouvez contacterÂ lâ€™agence ou lâ€™office de lâ€™eau ' +
      'ainsi que la DDT(M) ou la DREAL/DEAL concernÃ©es.<br/></p>';

    expect(formatAgentVerseauReport(report)).toBe(
      "**\nIMPORTANT : ne répondez pas à l'expéditeur de ce message, il s'agit d'un automate.\n**\n\n" +
        'Bonjour,\n\n' +
        "Le dépôt automatique du fichier n'a pas pu être effectué pour les raisons suivantes :\n" +
        " - Vous n'êtes pas déclaré en tant que déposant pour l'ouvrage référencé : 0485024S0001.\n\n" +
        'Pour toute question ou en cas de problème vous pouvez contacter l’agence ou l’office de l’eau ' +
        'ainsi que la DDT(M) ou la DREAL/DEAL concernées.',
    );
  });
});
