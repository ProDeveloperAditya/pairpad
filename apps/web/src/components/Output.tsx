import { Terminal, AlertCircle, Loader2 } from 'lucide-react';
import { SlidingNumber } from './ui/SlidingNumber';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

interface OutputProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  error: string | null;
  /** Who triggered the current/last run — shared across all clients. */
  runBy?: { name: string; color: string } | null;
}

export function Output({ result, isRunning, error, runBy }: OutputProps) {
  if (isRunning) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
        <Loader2 className="w-6 h-6 animate-spin text-accent dark:text-accent-light" />
        <span className="text-sm font-medium">
          {runBy ? (
            <>
              <span style={{ color: runBy.color }}>{runBy.name}</span> is running the
              code…
            </>
          ) : (
            'Executing...'
          )}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-destructive dark:text-destructive-light">
        <AlertCircle className="w-6 h-6" />
        <span className="text-sm font-medium">{error}</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-secondary)]">
        <Terminal className="w-8 h-8 opacity-40" />
        <span className="text-sm">Run your code to see output here</span>
        <div className="flex items-center gap-1.5 text-xs opacity-60">
          <kbd className="px-1.5 py-0.5 rounded border border-[var(--border-color)] bg-[var(--muted)] font-mono text-[10px]">
            ⌘ J
          </kbd>
          <span>Command palette</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-mono text-sm overflow-hidden">
      {/* Output content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {result.timedOut && (
          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2 text-xs font-sans font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Execution timed out (&gt;10s)
          </div>
        )}

        {result.stdout && (
          <div>
            <div className="text-xs text-[var(--text-secondary)] mb-1 font-sans font-medium uppercase tracking-wider">
              stdout
            </div>
            <pre className="whitespace-pre-wrap break-words text-[var(--text-primary)] leading-relaxed">
              {result.stdout}
            </pre>
          </div>
        )}

        {result.stderr && (
          <div>
            <div className="text-xs text-destructive dark:text-destructive-light mb-1 font-sans font-medium uppercase tracking-wider">
              stderr
            </div>
            <pre className="whitespace-pre-wrap break-words text-destructive dark:text-destructive-light leading-relaxed">
              {result.stderr}
            </pre>
          </div>
        )}

        {!result.stdout && !result.stderr && !result.timedOut && (
          <div className="text-[var(--text-secondary)] italic text-xs font-sans">
            No output produced
          </div>
        )}
      </div>

      {/* Footer with runner, exit code, and timing */}
      <div className="border-t border-[var(--border-color)] px-4 py-2 flex items-center justify-between gap-2 text-xs font-sans text-[var(--text-secondary)]">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
              result.exitCode === 0
                ? 'bg-success dark:bg-success-light'
                : 'bg-destructive dark:bg-destructive-light'
            }`}
          />
          <span className="shrink-0">exit: {result.exitCode}</span>
          {runBy && (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="shrink-0 opacity-50">·</span>
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: runBy.color }}
              />
              <span className="truncate">run by {runBy.name}</span>
            </span>
          )}
        </div>
        <span className="inline-flex items-center tabular-nums shrink-0">
          <SlidingNumber value={result.durationMs} />
          ms
        </span>
      </div>
    </div>
  );
}
