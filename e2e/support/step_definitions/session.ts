import { Given } from '@badeball/cypress-cucumber-preprocessor';

Given('je suis connecté comme déposant autorisé', () => {
  cy.login();
});
