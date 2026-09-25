export interface ProcessResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export interface ProcessRunOptions {
  readonly onStderr?: (chunk: string) => void;
  readonly onStdout?: (chunk: string) => void;
}

export type RunProcessAsync = (
  executable: string,
  args: readonly string[],
  options?: ProcessRunOptions,
) => Promise<ProcessResult>;
