export interface Decision {
  id: string;
  date: string;
  nature: 'Bilan écarté' | 'Événement exceptionnel' | 'Tolérance';
  ouvrage: string;
  description: string;
}

export const MOCK_DECISIONS: Decision[] = [
  {
    id: 'd1',
    date: '2025-03-01',
    nature: 'Bilan écarté',
    ouvrage: 'Station Nord',
    description: 'Événement pluvieux majeur',
  },
  {
    id: 'd2',
    date: '2025-03-02',
    nature: 'Événement exceptionnel',
    ouvrage: 'Station Sud',
    description: 'Panne électrique sur moteur de recirculation',
  },
  {
    id: 'd3',
    date: '2025-03-05',
    nature: 'Tolérance',
    ouvrage: 'Déversoir Ouest',
    description: 'Dépassement autorisé pour travaux de réhabilitation',
  },
  {
    id: 'd4',
    date: '2025-03-07',
    nature: 'Bilan écarté',
    ouvrage: 'Station Nord',
    description: 'Maintenance préventive exceptionnelle',
  },
  {
    id: 'd5',
    date: '2025-03-10',
    nature: 'Événement exceptionnel',
    ouvrage: 'Station Sud',
    description: 'Dysfonctionnement sonde NH4',
  },
];
