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
];

function searchCommunes(query: string): Promise<AutocompleteOption[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (q.length < 2) {
        resolve([]);
        return;
      }
      const results = COMMUNES.filter((c) => c.label.toLowerCase().startsWith(q)).map((c) => ({
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
              value={null}
              onChange={() => {}}
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
              value="bordeaux"
              onChange={() => {}}
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
