import { render, screen } from '@testing-library/react';
import { MasaStatus, type MasaDto } from '@lib/dossier';
import { describe, expect, it } from 'vitest';
import type { ControleFilterSet } from '../types/controle.types';
import { MasaIntegrationStatus } from './MasaIntegrationStatus';

const activeFilters: ControleFilterSet = new Set(['error']);
const testDate = new Date('2024-01-01T00:00:00.000Z');

function makeMasa(rapport: string | null): MasaDto {
  return {
    id: 'masa-id',
    numeroDepotVerseau1: null,
    statut: MasaStatus.REFUSE,
    rapport,
    createdAt: testDate,
    updatedAt: testDate,
  };
}

describe('MasaIntegrationStatus', () => {
  it('displays the formatted Agent Verseau report as plain text', () => {
    const report =
      "<p>IMPORTANT : ne rÃ©pondez pas Ã  l'expÃ©diteur.<br/></p>" +
      "<p>Le dÃ©pÃ´t n'a pas pu Ãªtre effectuÃ©.<br/></p>";

    render(
      <MasaIntegrationStatus title="Intégration des données" masa={makeMasa(report)} activeFilters={activeFilters} />,
    );

    const formattedReport = screen.getByText(/IMPORTANT : ne répondez pas à l'expéditeur/);
    expect(formattedReport).toHaveTextContent("IMPORTANT : ne répondez pas à l'expéditeur.");
    expect(formattedReport.textContent).toBe(
      "IMPORTANT : ne répondez pas à l'expéditeur.\n\nLe dépôt n'a pas pu être effectué.",
    );
    expect(screen.queryByText(/rÃ©pondez|<br|<p>/)).not.toBeInTheDocument();
  });

  it('does not interpret unhandled tags as HTML', () => {
    const { container } = render(
      <MasaIntegrationStatus
        title="Intégration des données"
        masa={makeMasa('<script>window.alert("test")</script><br>Fin')}
        activeFilters={activeFilters}
      />,
    );

    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(screen.getByText(/<script>window\.alert\("test"\)<\/script>/)).toBeInTheDocument();
  });

  it('shows an information message when the report is missing', () => {
    render(
      <MasaIntegrationStatus title="Intégration des données" masa={makeMasa(null)} activeFilters={activeFilters} />,
    );

    expect(screen.getByText("Aucun rapport d'intégration")).toBeInTheDocument();
  });
});
