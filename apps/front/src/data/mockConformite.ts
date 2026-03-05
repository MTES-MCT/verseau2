export interface ConformiteDetail {
  parametre: string;
  valeur: number;
  seuil: number;
  statut: 'Conforme' | 'Non conforme';
}

export interface Conformite {
  id: string;
  systeme: string;
  periode: string;
  statut: 'Conforme' | 'Non conforme' | 'En évaluation';
  details: ConformiteDetail[];
}

export const MOCK_CONFORMITE: Conformite[] = [
  {
    id: 'c1',
    systeme: 'Station Nord',
    periode: '2025-01',
    statut: 'Conforme',
    details: [
      { parametre: 'DCO', valeur: 110, seuil: 125, statut: 'Conforme' },
      { parametre: 'DBO5', valeur: 30, seuil: 40, statut: 'Conforme' },
    ],
  },
  {
    id: 'c2',
    systeme: 'Station Sud',
    periode: '2025-01',
    statut: 'Non conforme',
    details: [
      { parametre: 'DCO', valeur: 140, seuil: 125, statut: 'Non conforme' },
      { parametre: 'DBO5', valeur: 45, seuil: 40, statut: 'Non conforme' },
    ],
  },
  {
    id: 'c3',
    systeme: 'Déversoir Ouest',
    periode: '2025-01',
    statut: 'En évaluation',
    details: [],
  },
];
