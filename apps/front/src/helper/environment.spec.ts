import { describe, expect, it } from 'vitest';
import { getEnvironmentLabel } from './environment';

describe('getEnvironmentLabel', () => {
  it.each(['staging', 'Recette', 'Preprod'])('identifies the %s environment', (environment) => {
    expect(getEnvironmentLabel(environment)).toBe(environment);
  });

  it.each(['development', 'dev', ' Development '])('identifies explicit %s builds as development', (environment) => {
    expect(getEnvironmentLabel(environment)).toBe('Développement');
  });

  it.each(['production', 'prod', ' PRODUCTION ', 'Prod'])('hides %s', (environment) => {
    expect(getEnvironmentLabel(environment)).toBeUndefined();
  });

  it.each([undefined, '', '   '])('hides unconfigured environments (%s)', (environment) => {
    expect(getEnvironmentLabel(environment)).toBeUndefined();
  });
});
