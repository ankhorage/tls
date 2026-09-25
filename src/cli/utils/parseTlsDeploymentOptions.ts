interface ParsedTlsDeploymentOptions {
  readonly deployCommand?: string;
  readonly remaining: readonly string[];
}

/*** Parse an optional host deploy command while preserving command-specific arguments. */
export function parseTlsDeploymentOptions(argv: readonly string[]): ParsedTlsDeploymentOptions {
  return parseTokens(argv, { remaining: [] });
}

/*** Consume the deployment flag recursively without mutable parser state. */
function parseTokens(
  argv: readonly string[],
  parsed: ParsedTlsDeploymentOptions,
): ParsedTlsDeploymentOptions {
  const [token, value, ...rest] = argv;
  if (token === undefined) return parsed;

  if (token === '--deploy-command') {
    if (value === undefined || value.trim() === '' || value.startsWith('--')) {
      throw new Error('--deploy-command requires a non-empty shell command.');
    }
    return parseTokens(rest, { ...parsed, deployCommand: value });
  }

  return parseTokens(argv.slice(1), {
    ...parsed,
    remaining: [...parsed.remaining, token],
  });
}
