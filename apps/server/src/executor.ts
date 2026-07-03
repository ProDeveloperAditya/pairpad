import Docker from 'dockerode';
import { PassThrough } from 'stream';

export type Language = 'python' | 'javascript' | 'cpp' | 'c' | 'java' | 'ruby' | 'go';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export interface ExecutionRequest {
  code: string;
  language: Language;
}

const docker = new Docker();

const TIMEOUT_MS = 10_000;
const DEFAULT_MEMORY_MB = 128;
const CPU_SHARES = 512; // ~0.5 CPU
const OUTPUT_LIMIT_BYTES = 1024 * 1024; // 1 MB cap per stream to prevent memory blowups

interface LanguageConfig {
  image: string;
  /** Source filename written inside the container before running. */
  filename: string;
  /** Shell command (run from /tmp) that compiles and/or runs the source. */
  command: string;
  /** Memory cap override — compiled/JVM languages need more headroom. */
  memoryMb?: number;
}

/**
 * Per-language container recipe. Interpreted languages run the source directly;
 * compiled languages compile then run, with `&&` so a compile failure surfaces
 * as a non-zero exit + compiler stderr.
 */
const LANGUAGES: Record<Language, LanguageConfig> = {
  python: { image: 'python:3.11-alpine', filename: 'main.py', command: 'python3 main.py' },
  javascript: { image: 'node:20-alpine', filename: 'main.js', command: 'node main.js' },
  ruby: { image: 'ruby:3.3-alpine', filename: 'main.rb', command: 'ruby main.rb' },
  go: { image: 'golang:1.22-alpine', filename: 'main.go', command: 'go run main.go', memoryMb: 256 },
  c: { image: 'gcc:13', filename: 'main.c', command: 'gcc -O2 -o app main.c && ./app', memoryMb: 256 },
  cpp: {
    image: 'gcc:13',
    filename: 'main.cpp',
    command: 'g++ -O2 -std=c++17 -o app main.cpp && ./app',
    memoryMb: 256,
  },
  java: {
    image: 'eclipse-temurin:21-jdk-alpine',
    filename: 'Main.java',
    command: 'javac Main.java && java Main',
    memoryMb: 256,
  },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGES) as Language[];

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === 'string' && value in LANGUAGES;
}

/**
 * Collects a stream into a string, capping total bytes so a runaway program
 * (e.g. `while True: print('x')`) cannot exhaust server memory.
 */
function createCappedCollector(): { stream: PassThrough; getOutput: () => string } {
  const chunks: Buffer[] = [];
  let total = 0;
  const stream = new PassThrough();

  stream.on('data', (chunk: Buffer) => {
    if (total >= OUTPUT_LIMIT_BYTES) return;
    const remaining = OUTPUT_LIMIT_BYTES - total;
    const slice = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
    chunks.push(slice);
    total += slice.length;
  });

  return {
    stream,
    getOutput: () => Buffer.concat(chunks).toString('utf-8'),
  };
}

/**
 * Builds the container command. The user's source is base64-encoded and decoded
 * to a file inside the container — this avoids all shell-quoting/injection edge
 * cases (base64 output is restricted to a safe alphabet) and supports arbitrary
 * multi-line code. Shell metacharacters in the code are irrelevant: the
 * container itself is the security boundary (no network, ephemeral, capped).
 */
function buildCommand(config: LanguageConfig, code: string): string[] {
  const encoded = Buffer.from(code, 'utf-8').toString('base64');
  const script = `cd /tmp && echo '${encoded}' | base64 -d > ${config.filename} && ${config.command}`;
  return ['sh', '-c', script];
}

/**
 * Execute code in an isolated Docker container with strict resource limits.
 *
 * Safety model:
 * - NetworkMode 'none'  → no internet / network access from the container
 * - Memory cap           → OOM-killed if it exceeds the limit (swap disabled)
 * - CpuShares 512        → limited CPU relative to other containers
 * - 10s hard kill        → SIGKILL via container.kill() if it overruns
 * - AutoRemove           → container is destroyed after it exits
 * - PidsLimit            → mitigates fork bombs
 *
 * Never throws for code-level failures: a crashing or malicious program
 * resolves to a structured result. Only true infrastructure failures
 * (e.g. Docker daemon unreachable) reject.
 */
export async function executeCode(request: ExecutionRequest): Promise<ExecutionResult> {
  const startTime = Date.now();
  const config = LANGUAGES[request.language];
  const memoryBytes = (config.memoryMb ?? DEFAULT_MEMORY_MB) * 1024 * 1024;

  const container = await docker.createContainer({
    Image: config.image,
    Cmd: buildCommand(config, request.code),
    WorkingDir: '/tmp',
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    NetworkDisabled: true,
    HostConfig: {
      Memory: memoryBytes,
      MemorySwap: memoryBytes, // disallow swap → hard memory cap
      CpuShares: CPU_SHARES,
      NetworkMode: 'none',
      AutoRemove: true,
      PidsLimit: 128,
    },
  });

  const stdout = createCappedCollector();
  const stderr = createCappedCollector();
  let timedOut = false;

  try {
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    // Demultiplex the single attached stream into stdout/stderr.
    container.modem.demuxStream(stream, stdout.stream, stderr.stream);

    await container.start();

    const timeout = setTimeout(() => {
      timedOut = true;
      container.kill().catch(() => {
        /* container may have already exited */
      });
    }, TIMEOUT_MS);

    let statusCode: number;
    try {
      const result = await container.wait();
      statusCode = typeof result.StatusCode === 'number' ? result.StatusCode : -1;
    } finally {
      clearTimeout(timeout);
    }

    return {
      stdout: stdout.getOutput(),
      stderr: stderr.getOutput(),
      exitCode: timedOut ? -1 : statusCode,
      durationMs: Date.now() - startTime,
      timedOut,
    };
  } catch (error) {
    // Best-effort cleanup; AutoRemove usually handles it, but if start failed
    // the container can linger.
    container.remove({ force: true }).catch(() => {
      /* already gone */
    });

    if (timedOut) {
      return {
        stdout: stdout.getOutput(),
        stderr: stderr.getOutput(),
        exitCode: -1,
        durationMs: Date.now() - startTime,
        timedOut: true,
      };
    }

    throw error;
  }
}

/**
 * Pull the execution images so the first run isn't delayed by a cold pull.
 * Non-blocking and best-effort — logs progress, never throws.
 */
export async function pullImages(): Promise<void> {
  const images = [...new Set(Object.values(LANGUAGES).map((config) => config.image))];

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          docker.pull(image, (pullError: Error | null, stream: NodeJS.ReadableStream) => {
            if (pullError || !stream) {
              console.warn(`Could not pull image ${image}:`, pullError?.message ?? 'no stream');
              resolve();
              return;
            }
            docker.modem.followProgress(stream, (followError) => {
              if (followError) {
                console.warn(`Error pulling image ${image}:`, followError.message);
              } else {
                console.log(`Image ready: ${image}`);
              }
              resolve();
            });
          });
        })
    )
  );
}

/**
 * Check whether the Docker daemon is reachable. Used by the health endpoint.
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    return false;
  }
}
