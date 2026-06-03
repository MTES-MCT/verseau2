import { useState, useEffect, useRef } from 'react';
import { fr } from '@codegouvfr/react-dsfr';
import { Badge } from '@codegouvfr/react-dsfr/Badge';
import { SelectAutocomplete, type AutocompleteOption } from '../components/SelectAutocomplete';

const VILLES = [
  { value: 'paris', label: 'Paris', departement: '75' },
  { value: 'lyon', label: 'Lyon', departement: '69' },
  { value: 'marseille', label: 'Marseille', departement: '13' },
  { value: 'toulouse', label: 'Toulouse', departement: '31' },
  { value: 'nice', label: 'Nice', departement: '06' },
  { value: 'nantes', label: 'Nantes', departement: '44' },
  { value: 'strasbourg', label: 'Strasbourg', departement: '67' },
  { value: 'bordeaux', label: 'Bordeaux', departement: '33' },
];

const villeOptions = VILLES.map((v) => ({
  value: v.value,
  label: v.label,
  render: (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className={fr.cx('ri-map-pin-line')} aria-hidden="true" />
        {v.label}
      </span>
      <Badge small severity="info">
        {v.departement}
      </Badge>
    </span>
  ),
}));

const COMMUNES = [
  { value: 'fr-75056', label: 'Paris', codePostal: '75000', population: 2161000 },
  { value: 'fr-69123', label: 'Lyon', codePostal: '69001', population: 522000 },
  { value: 'fr-13055', label: 'Marseille', codePostal: '13001', population: 861000 },
  { value: 'fr-31555', label: 'Toulouse', codePostal: '31000', population: 479000 },
  { value: 'fr-06088', label: 'Nice', codePostal: '06000', population: 342000 },
  { value: 'fr-44109', label: 'Nantes', codePostal: '44000', population: 320000 },
  { value: 'fr-67482', label: 'Strasbourg', codePostal: '67000', population: 284000 },
  { value: 'fr-33063', label: 'Bordeaux', codePostal: '33000', population: 257000 },
  { value: 'fr-59350', label: 'Lille', codePostal: '59000', population: 233000 },
  { value: 'fr-34172', label: 'Montpellier', codePostal: '34000', population: 295000 },
  { value: 'fr-35238', label: 'Rennes', codePostal: '35000', population: 220000 },
  { value: 'fr-76540', label: 'Rouen', codePostal: '76000', population: 110000 },
  { value: 'fr-38185', label: 'Grenoble', codePostal: '38000', population: 158000 },
  { value: 'fr-51454', label: 'Reims', codePostal: '51100', population: 182000 },
  { value: 'fr-86194', label: 'Poitiers', codePostal: '86000', population: 88000 },
  { value: 'fr-42218', label: 'Saint-Étienne', codePostal: '42000', population: 172000 },
  { value: 'fr-76351', label: 'Le Havre', codePostal: '76600', population: 170000 },
  { value: 'fr-21231', label: 'Dijon', codePostal: '21000', population: 155000 },
  { value: 'fr-49007', label: 'Angers', codePostal: '49000', population: 155000 },
  { value: 'fr-30189', label: 'Nîmes', codePostal: '30000', population: 151000 },
  { value: 'fr-69266', label: 'Villeurbanne', codePostal: '69100', population: 150000 },
  { value: 'fr-63113', label: 'Clermont-Ferrand', codePostal: '63000', population: 146000 },
  { value: 'fr-72181', label: 'Le Mans', codePostal: '72000', population: 145000 },
  { value: 'fr-13001', label: 'Aix-en-Provence', codePostal: '13100', population: 143000 },
  { value: 'fr-29019', label: 'Brest', codePostal: '29200', population: 140000 },
  { value: 'fr-37261', label: 'Tours', codePostal: '37000', population: 137000 },
  { value: 'fr-80021', label: 'Amiens', codePostal: '80000', population: 134000 },
  { value: 'fr-87085', label: 'Limoges', codePostal: '87000', population: 132000 },
  { value: 'fr-57463', label: 'Metz', codePostal: '57000', population: 120000 },
  { value: 'fr-25056', label: 'Besançon', codePostal: '25000', population: 118000 },
  { value: 'fr-66136', label: 'Perpignan', codePostal: '66000', population: 120000 },
  { value: 'fr-45234', label: 'Orléans', codePostal: '45000', population: 117000 },
  { value: 'fr-68224', label: 'Mulhouse', codePostal: '68100', population: 109000 },
  { value: 'fr-14118', label: 'Caen', codePostal: '14000', population: 106000 },
  { value: 'fr-54395', label: 'Nancy', codePostal: '54000', population: 104000 },
  { value: 'fr-93066', label: 'Saint-Denis', codePostal: '93200', population: 112000 },
  { value: 'fr-95018', label: 'Argenteuil', codePostal: '95100', population: 110000 },
  { value: 'fr-93048', label: 'Montreuil', codePostal: '93100', population: 109000 },
  { value: 'fr-84007', label: 'Avignon', codePostal: '84000', population: 92000 },
  { value: 'fr-64445', label: 'Pau', codePostal: '64000', population: 77000 },
  { value: 'fr-62193', label: 'Calais', codePostal: '62100', population: 73000 },
  { value: 'fr-17300', label: 'La Rochelle', codePostal: '17000', population: 77000 },
  { value: 'fr-10387', label: 'Troyes', codePostal: '10000', population: 62000 },
  { value: 'fr-82121', label: 'Montauban', codePostal: '82000', population: 61000 },
  { value: 'fr-26362', label: 'Valence', codePostal: '26000', population: 64000 },
  { value: 'fr-73065', label: 'Chambéry', codePostal: '73000', population: 60000 },
  { value: 'fr-18033', label: 'Bourges', codePostal: '18000', population: 66000 },
  { value: 'fr-79191', label: 'Niort', codePostal: '79000', population: 59000 },
  { value: 'fr-74010', label: 'Annecy', codePostal: '74000', population: 130000 },
  { value: 'fr-06029', label: 'Cannes', codePostal: '06400', population: 74000 },
  { value: 'fr-68066', label: 'Colmar', codePostal: '68000', population: 68000 },
  { value: 'fr-90010', label: 'Belfort', codePostal: '90000', population: 47000 },
  { value: 'fr-28085', label: 'Chartres', codePostal: '28000', population: 39000 },
  { value: 'fr-56121', label: 'Lorient', codePostal: '56100', population: 58000 },
  { value: 'fr-56260', label: 'Vannes', codePostal: '56000', population: 54000 },
  { value: 'fr-64102', label: 'Bayonne', codePostal: '64100', population: 52000 },
  { value: 'fr-2B033', label: 'Bastia', codePostal: '20200', population: 48000 },
  { value: 'fr-2A004', label: 'Ajaccio', codePostal: '20000', population: 71000 },
  { value: 'fr-35288', label: 'Saint-Malo', codePostal: '35400', population: 47000 },
  { value: 'fr-41018', label: 'Blois', codePostal: '41000', population: 46000 },
  { value: 'fr-16015', label: 'Angoulême', codePostal: '16000', population: 42000 },
  { value: 'fr-59183', label: 'Dunkerque', codePostal: '59140', population: 88000 },
  { value: 'fr-34032', label: 'Béziers', codePostal: '34500', population: 78000 },
  { value: 'fr-19031', label: 'Brive-la-Gaillarde', codePostal: '19100', population: 48000 },
  { value: 'fr-11069', label: 'Carcassonne', codePostal: '11000', population: 46000 },
  { value: 'fr-85191', label: 'La Roche-sur-Yon', codePostal: '85000', population: 55000 },
  { value: 'fr-62041', label: 'Arras', codePostal: '62000', population: 42000 },
  { value: 'fr-53130', label: 'Laval', codePostal: '53000', population: 51000 },
  { value: 'fr-27229', label: 'Évreux', codePostal: '27000', population: 48000 },
  { value: 'fr-71270', label: 'Mâcon', codePostal: '71000', population: 34000 },
  { value: 'fr-47001', label: 'Agen', codePostal: '47000', population: 34000 },
  { value: 'fr-42187', label: 'Roanne', codePostal: '42300', population: 35000 },
  { value: 'fr-81065', label: 'Castres', codePostal: '81100', population: 42000 },
  { value: 'fr-58194', label: 'Nevers', codePostal: '58000', population: 34000 },
  { value: 'fr-89024', label: 'Auxerre', codePostal: '89000', population: 35000 },
  { value: 'fr-81004', label: 'Albi', codePostal: '81000', population: 49000 },
  { value: 'fr-65440', label: 'Tarbes', codePostal: '65000', population: 42000 },
  { value: 'fr-49099', label: 'Cholet', codePostal: '49300', population: 54000 },
  { value: 'fr-22278', label: 'Saint-Brieuc', codePostal: '22000', population: 45000 },
  { value: 'fr-29232', label: 'Quimper', codePostal: '29000', population: 64000 },
  { value: 'fr-01053', label: 'Bourg-en-Bresse', codePostal: '01000', population: 42000 },
  { value: 'fr-71076', label: 'Chalon-sur-Saône', codePostal: '71100', population: 45000 },
  { value: 'fr-36044', label: 'Châteauroux', codePostal: '36000', population: 44000 },
  { value: 'fr-03185', label: 'Montluçon', codePostal: '03100', population: 36000 },
  { value: 'fr-60057', label: 'Beauvais', codePostal: '60000', population: 57000 },
  { value: 'fr-60159', label: 'Compiègne', codePostal: '60200', population: 42000 },
  { value: 'fr-77288', label: 'Melun', codePostal: '77000', population: 40000 },
  { value: 'fr-77284', label: 'Meaux', codePostal: '77100', population: 55000 },
  { value: 'fr-78646', label: 'Versailles', codePostal: '78000', population: 85000 },
  { value: 'fr-92050', label: 'Nanterre', codePostal: '92000', population: 96000 },
  { value: 'fr-94028', label: 'Créteil', codePostal: '94000', population: 92000 },
  { value: 'fr-93005', label: 'Aulnay-sous-Bois', codePostal: '93600', population: 86000 },
  { value: 'fr-94081', label: 'Vitry-sur-Seine', codePostal: '94400', population: 96000 },
  { value: 'fr-92025', label: 'Colombes', codePostal: '92700', population: 86000 },
  { value: 'fr-92004', label: 'Asnières-sur-Seine', codePostal: '92600', population: 86000 },
  { value: 'fr-92026', label: 'Courbevoie', codePostal: '92400', population: 82000 },
  { value: 'fr-02691', label: 'Saint-Quentin', codePostal: '02100', population: 54000 },
  { value: 'fr-59178', label: 'Douai', codePostal: '59500', population: 40000 },
  { value: 'fr-59606', label: 'Valenciennes', codePostal: '59300', population: 44000 },
  { value: 'fr-08105', label: 'Charleville-Mézières', codePostal: '08000', population: 47000 },
];

function searchCommunes(query: string): Promise<AutocompleteOption[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (q.length < 2) {
        resolve([]);
        return;
      }
      const results = COMMUNES.filter((c) => c.label.toLowerCase().includes(q))
        .splice(0, 5)
        .map((c) => ({
          value: c.value,
          label: c.label,
          render: (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={fr.cx('ri-community-line')} aria-hidden="true" />
                {c.label}
              </span>
              <span style={{ display: 'flex', gap: '0.5rem' }}>
                <Badge small severity="info">
                  {c.codePostal}
                </Badge>
                <Badge small>{(c.population / 1000).toFixed(0)}k hab.</Badge>
              </span>
            </span>
          ),
        }));
      resolve(results);
    }, 400);
  });
}

function useAsyncSearch(searchFn: (q: string) => Promise<AutocompleteOption[]>) {
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef('');

  const search = (query: string) => {
    latestQueryRef.current = query;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchFn(query);
      // Ignore stale responses
      if (query === latestQueryRef.current) {
        setOptions(results);
        setIsLoading(false);
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { options, isLoading, search };
}

export function DesignSystemPage() {
  const [selectedSimple, setSelectedSimple] = useState<string | null>(null);
  const [selectedRich, setSelectedRich] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [selectedSuccess, setSelectedSuccess] = useState<string | null>('bordeaux');
  const [selectedAsync, setSelectedAsync] = useState<string | null>(null);
  const { options: asyncOptions, isLoading: asyncLoading, search: searchAsync } = useAsyncSearch(searchCommunes);

  return (
    <div className={fr.cx('fr-container', 'fr-py-6w')}>
      <h1 className={fr.cx('fr-h1')}>Design System</h1>
      <p className={fr.cx('fr-text--lead', 'fr-mb-4w')}>Catalogue des composants disponibles dans l'application.</p>

      <hr className={fr.cx('fr-hr')} />

      {/* SelectAutocomplete */}
      <section className={fr.cx('fr-mb-6w')}>
        <h2 className={fr.cx('fr-h2')}>SelectAutocomplete</h2>
        <p className={fr.cx('fr-mb-4w')}>
          Champ de saisie avec autocomplétion. Supporte un rendu personnalisé dans la liste via la prop{' '}
          <code>render</code>.
        </p>

        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
          {/* Variante simple */}
          <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
            <h3 className={fr.cx('fr-h6')}>Variante simple (label uniquement)</h3>
            <SelectAutocomplete
              label="Ville"
              hintText="Commencez à saisir pour filtrer"
              options={villeOptions.map(({ value, label }) => ({ value, label }))}
              value={selectedSimple}
              onChange={setSelectedSimple}
              placeholder="Ex : Paris"
            />
            {selectedSimple && (
              <p className={fr.cx('fr-mt-1w', 'fr-text--sm')}>
                Valeur sélectionnée : <code>{selectedSimple}</code>
              </p>
            )}
          </div>

          {/* Variante avec render personnalisé */}
          <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
            <h3 className={fr.cx('fr-h6')}>Variante avec render personnalisé</h3>
            <SelectAutocomplete
              label="Ville (avec badge département)"
              hintText="Les options affichent un badge avec le numéro de département"
              options={villeOptions}
              value={selectedRich}
              onChange={setSelectedRich}
              placeholder="Ex : Lyon"
            />
            {selectedRich && (
              <p className={fr.cx('fr-mt-1w', 'fr-text--sm')}>
                Valeur sélectionnée : <code>{selectedRich}</code>
              </p>
            )}
          </div>

          {/* Variante avec état d'erreur */}
          <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
            <h3 className={fr.cx('fr-h6')}>État erreur</h3>
            <SelectAutocomplete
              label="Ville (erreur)"
              state="error"
              stateRelatedMessage="Veuillez sélectionner une ville dans la liste."
              options={villeOptions}
              value={selectedError}
              onChange={setSelectedError}
            />
          </div>

          {/* Variante avec état succès */}
          <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
            <h3 className={fr.cx('fr-h6')}>État succès</h3>
            <SelectAutocomplete
              label="Ville (succès)"
              state="success"
              stateRelatedMessage="Ville valide."
              options={villeOptions}
              value={selectedSuccess}
              onChange={setSelectedSuccess}
            />
          </div>

          {/* Variante asynchrone */}
          <div className={fr.cx('fr-col-12')}>
            <h3 className={fr.cx('fr-h6')}>Données asynchrones (mock, délai 400ms)</h3>
            <p className={fr.cx('fr-text--sm', 'fr-mb-2w')}>
              Les options sont chargées via une promesse à chaque saisie (debounce 300ms). Saisissez au moins 2
              caractères.
            </p>
            <div className={fr.cx('fr-col-12', 'fr-col-md-6')}>
              <SelectAutocomplete
                label="Commune"
                hintText={asyncLoading ? 'Recherche en cours…' : 'Ex : Par, Ly, Mar…'}
                options={asyncOptions}
                value={selectedAsync}
                onChange={setSelectedAsync}
                onInputChange={searchAsync}
                clientSideFilter={false}
                placeholder="Saisir le début du nom"
              />
              {selectedAsync && (
                <p className={fr.cx('fr-mt-1w', 'fr-text--sm')}>
                  Valeur sélectionnée : <code>{selectedAsync}</code>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
