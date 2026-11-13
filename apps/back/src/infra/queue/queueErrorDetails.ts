/**
 * pg-boss emits both Error instances and plain objects for background failures.
 * Keep diagnostic fields without logging job data or connection configuration.
 */
export function getQueueErrorDetails(error: unknown): Record<string, string | number> {
  if (typeof error !== 'object' || error === null) {
    return { message: String(error) };
  }

  const details: Record<string, string | number> = { message: 'Unknown queue error' };

  for (const field of ['name', 'message', 'stack', 'code', 'queue', 'worker'] as const) {
    if (field in error) {
      const value: unknown = error[field];
      if (typeof value === 'string' || typeof value === 'number') {
        details[field] = value;
      }
    }
  }

  return details;
}
