declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
    }
  }
}

// The localhost mock-OIDC transaction uses a Secure, httpOnly cookie. Driving
// the app once in the browser lets it manage the signed cookie and expiry data.
Cypress.Commands.add('login', () => {
  cy.session('e2e-deposant', () => {
    cy.visit('/mock_authorization');
    cy.contains('button', 'Simuler authentification OIDC').click();
    cy.location('pathname').should('eq', '/dashboard');
  }, {
    validate() {
      cy.request('http://localhost:3000/api/auth/me').its('status').should('eq', 200);
    },
  });
});

export {};
