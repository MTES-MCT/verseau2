import { When, Then } from '@badeball/cypress-cucumber-preprocessor';

const filename = 'depot-valide.xml';
const failedFilename = 'depot-controle-en-echec.xml';
const masaReport = 'Retour MASA pour le dépôt';
let depotId: string;

function uploadFile(file: string) {
  cy.visit('/depot/upload');
  cy.get('input[type="file"]').selectFile(`fixtures/files/${file}`);
  cy.contains('button', "Passer à l'étape 2").click();
  cy.contains('button', 'Étape 3 finaliser le dépôt').should('be.enabled');
  cy.intercept('POST', '**/api/depot/upload').as('upload');
  cy.contains('button', 'Étape 3 finaliser le dépôt').click();
  cy.wait('@upload').then(({ response }) => {
    expect(response?.statusCode).to.eq(201);
    depotId = (response?.body as { id: string }).id;
  });
  cy.location('pathname').should('eq', '/dashboard');
}

When("je dépose un fichier d'autosurveillance valide", () => {
  uploadFile(filename);
});

When("je dépose un fichier d'autosurveillance avec un type d'ouvrage inconnu", () => {
  uploadFile(failedFilename);
});

Then('le dépôt apparaît dans mon tableau de bord', () => {
  cy.contains('tr', filename, { timeout: 20000 }).should('be.visible');
});

function waitForWorkerJob(queue: 'process_file' | 'controle_metier' | 'process_after_masa_webhook') {
  const deadline = Date.now() + 90000;
  const poll = (): void => {
    cy.task<string | null>('workerJobState', { depotId, queue }).then((state) => {
      if (state === 'completed') {
        return;
      }
      expect(state, `${queue} job has not failed`).to.not.eq('failed');
      expect(Date.now(), `${queue} completion deadline`).to.be.lessThan(deadline);
      cy.wait(500).then(poll);
    });
  };
  poll();
}

Then('son traitement par le worker est terminé', () => {
  // The depot stays in progress until MASA calls the webhook.
  waitForWorkerJob('process_file');
  waitForWorkerJob('controle_metier');
});

function sendMasaReturn(statut: 'Intégré' | 'Rejeté') {
  cy.request({
    method: 'POST',
    url: 'http://localhost:3000/api/webhook/masa/agent-verseau',
    headers: { 'x-api-key': Cypress.env('MASA_API_KEY') as string },
    body: {
      verseau2DepotId: depotId,
      numeroDepotVerseau1: `V1-${depotId}`,
      statut,
      rapport: `${masaReport} : ${statut}`,
    },
  })
    .its('status')
    .should('eq', 200);
}

When("MASA confirme l'intégration du dépôt", () => sendMasaReturn('Intégré'));
When('MASA rejette le dépôt', () => sendMasaReturn('Rejeté'));

Then('le retour MASA est traité par le worker', () => {
  waitForWorkerJob('process_after_masa_webhook');
});

function checkMasaStatusOnDashboard(status: 'Intégré' | 'Rejeté') {
  cy.visit('/dashboard');
  cy.contains('tr', `V1-${depotId}`, { timeout: 20000 }).within(() => {
    cy.contains(filename).should('be.visible');
    cy.contains(status).should('be.visible');
    cy.contains('a', 'Voir').click();
  });
  cy.location('pathname').should('eq', `/controle/${depotId}`);
}

Then('le dépôt est affiché comme intégré dans mon tableau de bord', () => checkMasaStatusOnDashboard('Intégré'));
Then('le dépôt est affiché comme rejeté dans mon tableau de bord', () => checkMasaStatusOnDashboard('Rejeté'));

Then("le résultat d'intégration MASA est consultable", () => {
  // Successful MASA results are hidden by the default control filters.
  cy.get('[data-testid="clickable-stat-card-Succès"] button').click();
  cy.contains('tr', 'Intégration Verseau 1').contains('Succès').should('be.visible');
});

Then('le motif de rejet MASA est consultable', () => {
  cy.contains('tr', 'Intégration Verseau 1').within(() => {
    cy.contains('Erreur').should('be.visible');
    cy.contains(`${masaReport} : Rejeté`).should('be.visible');
  });
});

Then('ses résultats de contrôle sont consultables', () => {
  cy.request<unknown[]>(`http://localhost:3000/api/depot/${depotId}/controle`)
    .its('body')
    .should('have.length.greaterThan', 0);
  cy.contains('tr', filename).contains('a', 'Voir').click();
  cy.location('pathname').should('eq', `/controle/${depotId}`);
  cy.contains('h1', 'Résultats des contrôles').should('be.visible');
  // Successful controls are hidden by the page's default filters.
  cy.get('[data-testid="clickable-stat-card-Succès"] button').click();
  cy.contains('h2', 'Contrôles métiers, référentiels et de cohérence des données (ROSEAU)').should('be.visible');
});

Then("je consulte l'erreur du fichier sur la page des contrôles", () => {
  cy.contains('tr', failedFilename, { timeout: 20000 }).contains('a', 'Voir').click();
  cy.location('pathname').should('eq', `/controle/${depotId}`);
  cy.contains('h1', 'Résultats des contrôles').should('be.visible');
  cy.contains('tr', 'CTL024').within(() => {
    cy.contains('Échec').should('be.visible');
    cy.contains("Le code Sandre 9999 du type d'ouvrage de dépollution est inconnu").should('be.visible');
  });
});

When("je sélectionne un fichier d'autosurveillance pour un ouvrage non autorisé", () => {
  cy.intercept('GET', '**/api/depot/droits-de-depot*').as('droitsDeDepot');
  cy.intercept('POST', '**/api/depot/upload').as('uploadRefuse');
  cy.visit('/depot/upload');
  cy.get('input[type="file"]').selectFile('fixtures/files/depot-sans-droits.xml');
  cy.contains('button', "Passer à l'étape 2").click();
});

Then('mes droits de dépôt sur ce fichier sont refusés', () => {
  cy.wait('@droitsDeDepot').then(({ response }) => {
    expect(response?.statusCode).to.eq(200);
    expect(response?.body).to.deep.eq({ authorized: false, errorCode: 'DROITS_INSUFFISANTS' });
  });
  cy.contains('Droits de dépôt - habilitations du déposant insuffisantes').should('be.visible');
});

Then('je ne peux pas finaliser le dépôt', () => {
  cy.contains('button', 'Étape 3 finaliser le dépôt').should('be.disabled');
  cy.get('@uploadRefuse.all').should('have.length', 0);
  cy.location('pathname').should('eq', '/depot/upload/recap');
});
