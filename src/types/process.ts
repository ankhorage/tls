export interface ProcessResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

export type RunProcessAsync = (
  executable: string,
  args: readonly string[],
) => Promise<ProcessResult>;
