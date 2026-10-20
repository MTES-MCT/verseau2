import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnvironmentWatermark } from './EnvironmentWatermark';

const config = vi.hoisted(() => ({ APP_ENV: undefined as string | undefined }));

vi.mock('../appConfig', () => config);

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  config.APP_ENV = undefined;
});

function getBackgroundSvg(theme: 'light' | 'dark' = 'light') {
  const surface = screen.getByText(/Environnement :/).parentElement;
  const image = surface?.style.getPropertyValue(`--environment-watermark-${theme}`) ?? '';
  const svg = decodeURIComponent(image.slice('url("data:image/svg+xml,'.length, -2));
  return new DOMParser().parseFromString(svg, 'image/svg+xml');
}

describe('EnvironmentWatermark', () => {
  it.each(['staging', 'Recette', 'Preprod'])('renders %s as a repeated background, not an overlay', (environment) => {
    config.APP_ENV = environment;
    vi.stubEnv('DEV', false);

    const { container } = render(<EnvironmentWatermark />);

    expect(screen.getByText(`Environnement : ${environment}`)).toHaveClass('fr-sr-only');
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    const svg = getBackgroundSvg();
    expect(svg.querySelector('text')?.textContent).toBe(environment);
    expect(svg.querySelector('pattern')?.getAttribute('patternTransform')).toBe('rotate(-25)');
    expect(svg.querySelector('pattern')?.getAttribute('patternUnits')).toBe('userSpaceOnUse');
    expect(svg.querySelector('pattern')?.getAttribute('width')).toBe('280');
    expect(svg.querySelector('pattern')?.getAttribute('height')).toBe('180');
  });

  it('identifies explicit development with the exact casing', () => {
    config.APP_ENV = 'development';
    vi.stubEnv('DEV', true);

    render(<EnvironmentWatermark />);

    expect(screen.getByText('Environnement : Développement')).toBeInTheDocument();
    expect(getBackgroundSvg().querySelector('text')?.textContent).toBe('Développement');
  });

  it.each([undefined, '', '   '])('adds nothing when VITE_APP_ENV is %s, even in development', (environment) => {
    config.APP_ENV = environment;
    vi.stubEnv('DEV', true);

    const { container } = render(
      <EnvironmentWatermark>
        <main>App content</main>
      </EnvironmentWatermark>,
    );

    expect(container.firstElementChild).toBe(screen.getByRole('main'));
    expect(screen.queryByText(/Environnement :/)).not.toBeInTheDocument();
  });

  it('provides separate low-opacity backgrounds for light and dark themes', () => {
    config.APP_ENV = 'staging';

    render(<EnvironmentWatermark />);

    expect(getBackgroundSvg('light').querySelector('text')?.getAttribute('fill')).toBe('#161616');
    expect(getBackgroundSvg('dark').querySelector('text')?.getAttribute('fill')).toBe('#ffffff');
    expect(getBackgroundSvg().querySelector('text')?.getAttribute('fill-opacity')).toBe('0.08');
  });

  it('preserves app content and interactions above the background', () => {
    config.APP_ENV = 'staging';
    const onClick = vi.fn();

    render(
      <EnvironmentWatermark>
        <header>Header</header>
        <main>
          <button onClick={onClick}>Continue</button>
        </main>
        <footer>Footer</footer>
      </EnvironmentWatermark>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('contentinfo')).toBeVisible();
  });

  it.each(['production', 'prod', undefined])(
    'does not add backgrounds or wrappers in production (%s)',
    (environment) => {
      config.APP_ENV = environment;
      vi.stubEnv('DEV', false);

      const { container } = render(
        <EnvironmentWatermark>
          <main>App content</main>
        </EnvironmentWatermark>,
      );

      expect(container.firstElementChild).toBe(screen.getByRole('main'));
      expect(screen.queryByText(/Environnement :/)).not.toBeInTheDocument();
    },
  );

  it('escapes environment names when embedding them in SVG', () => {
    config.APP_ENV = 'Test <script> & "preview"';

    render(<EnvironmentWatermark />);

    const svg = getBackgroundSvg();
    expect(svg.querySelector('text')?.textContent).toBe(config.APP_ENV);
    expect(svg.querySelector('script')).toBeNull();
    expect(svg.querySelector('parsererror')).toBeNull();
  });
});
