import type { ProcessRunOptions, RunProcessAsync } from '../types/process.js';

/*** Run one process and throw captured diagnostics on failure. */
export async function runCheckedProcessAsync(
  executable: string,
  args: readonly string[],
  runProcessAsync: RunProcessAsync,
  options?: ProcessRunOptions,
): Promise<{ readonly stderr: string; readonly stdout: string }> {
  const result = await runProcessAsync(executable, args, options);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.trim() || `Command failed with exit code ${result.exitCode}.`);
  }
  return result;
}
