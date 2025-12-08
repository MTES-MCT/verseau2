export default class PgBoss {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(connectionString: string) {}

  async start(): Promise<void> {
    // no-op
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createQueue(name: string): Promise<void> {
    // no-op
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(name: string, data?: unknown, options?: unknown): string | null {
    return 'mock-job';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  work(name: string, handlerOrOptions?: unknown, handlerMaybe?: unknown): string {
    return 'mock-worker';
  }
}
