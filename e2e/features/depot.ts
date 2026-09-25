import { When, Then } from '@badeball/cypress-cucumber-preprocessor';

const filename = 'depot-valide.xml';
let depotId: string;

When("je dépose un fichier d'autosurveillance valide", () => {
  cy.visit('/depot/upload');
  cy.get('input[type="file"]').selectFile(`fixtures/files/${filename}`);
  cy.contains('button', "Passer à l'étape 2").click();
  cy.contains('button', 'Étape 3 finaliser le dépôt').should('be.enabled');
  cy.intercept('POST', '**/api/depot/upload').as('upload');
  cy.contains('button', 'Étape 3 finaliser le dépôt').click();
  cy.wait('@upload').then(({ response }) => {
    expect(response?.statusCode).to.eq(201);
    depotId = (response?.body as { id: string }).id;
  });
  cy.location('pathname').should('eq', '/dashboard');
});

Then('le dépôt apparaît dans mon tableau de bord', () => {
  cy.contains('tr', filename, { timeout: 20000 }).should('be.visible');
});

Then('son traitement par le worker est terminé', () => {
  // Deposit status stays "in progress" until the later MASA webhook. Assert
  // the actual worker job completed instead of waiting for a final depot status.
  const deadline = Date.now() + 90000;
  const poll = (queue: 'process_file' | 'controle_metier'): void => {
    cy.task<string | null>('workerJobState', { depotId, queue }).then((state) => {
      if (state === 'completed') {
        if (queue === 'process_file') {
          poll('controle_metier');
        }
        return;
      }
      expect(state, 'worker job has not failed').to.not.eq('failed');
      expect(Date.now(), 'worker completion deadline').to.be.lessThan(deadline);
      cy.wait(500).then(() => poll(queue));
    });
  };
  poll('process_file');
});

Then('ses résultats de contrôle sont consultables', () => {
  cy.request<unknown[]>(`http://localhost:3000/api/depot/${depotId}/controle`)
    .its('body')
    .should('have.length.greaterThan', 0);
  cy.visit(`/controle/${depotId}`);
  cy.contains('h1', 'Résultats des contrôles').should('be.visible');
});
