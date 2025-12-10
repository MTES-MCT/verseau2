// Temporary component to capture the shared fake token while OIDC is offline.
import { FAKE_TOKEN_STORAGE_KEY, useFakeToken } from '../temp/fakeAuth';

type Props = {
  className?: string;
};

export function TemporaryFakeTokenInput({ className }: Props) {
  const { fakeToken, setFakeToken } = useFakeToken();

  return (
    <div className={className}>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="fake-token-input">
          Jeton temporaire (OIDC_FAKE_TOKEN)
        </label>
        <input
          id="fake-token-input"
          className="fr-input"
          type="text"
          placeholder="Coller le jeton partagé pour les appels API"
          value={fakeToken}
          onChange={(event) => setFakeToken(event.target.value)}
        />
        <p className="fr-hint-text">
          Le jeton est enregistré dans le stockage local ({FAKE_TOKEN_STORAGE_KEY}) le temps de la
          session et sera envoyé en en-tête Authorization.
        </p>
      </div>
    </div>
  );
}

