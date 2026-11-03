/**
 * Minimal structured logger. Emits one JSON object per line so logs can be
 * treated as an event stream (12-factor XI) and ingested by log aggregators.
 *
 * Callers are responsible for not passing secrets in `context`; this logger
 * does not transform or persist values beyond serializing them to the stream.
 */

export type LogLevel = "info" | "warn" | "error";

export function log(
  level: LogLevel,
  msg: string,
  context?: Record<string, unknown>,
): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    msg,
  };
  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  const line = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}
