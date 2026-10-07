import { areCapabilitiesEqual, isCapability } from '@ankhorage/contracts/capabilities';
import { expect, test } from 'bun:test';

import packageJson from '../../package.json' with { type: 'json' };
import { CAPABILITIES } from '../capabilities/index.js';
import provider from './index.js';

test('publishes canonical TLS capabilities without catalog drift', () => {
  expect(CAPABILITIES).toHaveLength(6);
  expect(CAPABILITIES.every(isCapability)).toBeTrue();
  expect(new Set(CAPABILITIES.map(({ id }) => id)).size).toBe(CAPABILITIES.length);

  expect(packageJson.exports['./capabilities']).toEqual({
    types: './dist/capabilities/index.d.ts',
    import: './dist/capabilities/index.js',
    default: './dist/capabilities/index.js',
  });
  expect(packageJson.ankh.capabilities).toHaveLength(CAPABILITIES.length);

  for (const [index, capability] of CAPABILITIES.entries()) {
    const published = packageJson.ankh.capabilities.at(index);
    expect(isCapability(published)).toBeTrue();
    if (!isCapability(published)) continue;
    expect(areCapabilitiesEqual(published, capability)).toBeTrue();
  }

  expect(provider.version).toBe(packageJson.version);
  expect(provider.capabilities).toBe(CAPABILITIES);
  expect(new Set(provider.commands.map(({ capability }) => capability))).toEqual(
    new Set(CAPABILITIES.map(({ id }) => id)),
  );
});
