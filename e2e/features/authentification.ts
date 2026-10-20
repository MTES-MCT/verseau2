import { When, Then } from '@badeball/cypress-cucumber-preprocessor';

When('je visite le tableau de bord sans session', () => {
  cy.clearAllCookies();
  cy.visit('/dashboard');
});

When('je visite le tableau de bord', () => {
  cy.visit('/dashboard');
});

When('je simule la connexion OIDC de développement', () => {
  cy.visit('/mock_authorization');
  cy.contains('button', 'Simuler authentification OIDC').click();
  cy.location('pathname').should('eq', '/dashboard');
});

Then("je suis redirigé vers l'accueil", () => {
  cy.location('pathname').should('eq', '/');
  cy.contains('h1', 'Bienvenue sur Verseau 2').should('be.visible');
});

Then('je vois le tableau de bord', () => {
  cy.contains('Fichiers déposés').should('be.visible');
  cy.request('http://localhost:3000/api/indicateurs/steu?page=1&pageSize=10')
    .its('status')
    .should('eq', 200);
});
