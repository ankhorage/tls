import { defineParadoxConfig } from '@ankhorage/paradox';

export default defineParadoxConfig({
  mode: 'write',
  docs: {
    title: '@ankhorage/tls',
    description: 'Provider-agnostic TLS certificate lifecycle and automation.',
    usage: {
      entrypoints: ['examples/basic-usage/index.ts'],
    },
  },
  package: {
    entrypoints: ['src/index.ts', 'src/cli/index.ts'],
  },
  output: {
    dir: 'paradox',
  },
});
