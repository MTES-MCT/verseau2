export interface Ouvrage {
  id: string;
  nom: string;
  type: string;
  codePointMesure: string;
  capaciteNominale: string;
  statut: 'Conforme' | 'Incohérent' | 'En cours de modification';
}

export const MOCK_OUVRAGES: Ouvrage[] = [
  {
    id: 'ouv_1',
    nom: 'Station de traitement Nord',
    type: 'Step',
    codePointMesure: 'FR_12345',
    capaciteNominale: '5000 EH',
    statut: 'Conforme',
  },
  {
    id: 'ouv_2',
    nom: 'Déversoir Ouest',
    type: "Déversoir d'orage",
    codePointMesure: 'FR_67890',
    capaciteNominale: 'N/A',
    statut: 'Incohérent',
  },
  {
    id: 'ouv_3',
    nom: 'Station de traitement Sud',
    type: 'Step',
    codePointMesure: 'FR_11223',
    capaciteNominale: '12000 EH',
    statut: 'Conforme',
  },
];
