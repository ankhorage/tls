import { spawn } from 'node:child_process';

import type { ProcessResult, ProcessRunOptions } from '../types/process.js';

/*** Execute a process while capturing output and optionally streaming chunks to the caller. */
export function runProcessAsync(
  executable: string,
  args: readonly string[],
  options: ProcessRunOptions = {},
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => {
      stdout.push(chunk);
      options.onStdout?.(chunk.toString('utf8'));
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr.push(chunk);
      options.onStderr?.(chunk.toString('utf8'));
    });
    child.once('error', reject);
    child.once('close', (code) =>
      resolve({
        exitCode: code ?? 1,
        stderr: Buffer.concat(stderr).toString('utf8'),
        stdout: Buffer.concat(stdout).toString('utf8'),
      }),
    );
  });
}
