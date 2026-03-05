export interface SuiviDepot {
  id: string;
  ouvrage: string;
  periode: string;
  statut: 'Transmis' | 'En attente' | 'En retard' | 'Rejeté';
}

export const MOCK_SUIVI_DEPOTS: SuiviDepot[] = [
  { id: 'sd1', ouvrage: 'Station Nord', periode: '2025-01', statut: 'Transmis' },
  { id: 'sd2', ouvrage: 'Station Nord', periode: '2025-02', statut: 'En retard' },
  { id: 'sd3', ouvrage: 'Station Sud', periode: '2025-01', statut: 'Transmis' },
  { id: 'sd4', ouvrage: 'Station Sud', periode: '2025-02', statut: 'En attente' },
  { id: 'sd5', ouvrage: 'Déversoir Ouest', periode: '2025-01', statut: 'Rejeté' },
  { id: 'sd6', ouvrage: 'Déversoir Ouest', periode: '2025-02', statut: 'En attente' },
];
