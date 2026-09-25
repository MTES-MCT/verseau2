import { Given } from '@badeball/cypress-cucumber-preprocessor';

Given('que je suis connecté comme déposant autorisé', () => {
  cy.login();
});
