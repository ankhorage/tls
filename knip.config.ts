import { createKnipConfig } from '@ankhorage/devtools/knip';

export default createKnipConfig({
  entry: ['examples/basic-usage/index.ts', 'paradox.config.ts'],
  ignoreFiles: [
    '.prettierrc.js',
    'eslint.config.mjs',
    'eslint.local.config.mjs',
    'prettier.local.config.js',
  ],
});
