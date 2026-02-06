/* eslint-disable @typescript-eslint/no-unused-vars */
export default class PgBoss {
  constructor(connectionString: string) {}

  async start(): Promise<void> {
    // no-op
  }

  async stop(): Promise<void> {
    // no-op
  }

  async createQueue(name: string, options?: unknown): Promise<void> {
    // no-op
  }

  async updateQueue(name: string, options?: unknown): Promise<void> {
    // no-op
  }

  async getQueue(name: string): Promise<void> {
    // no-op
  }

  on(event: string, handler: (error: Error) => void): void {
    // no-op
  }

  send(name: string, data?: unknown, options?: unknown): string | null {
    return 'mock-job';
  }

  work(name: string, handlerOrOptions?: unknown, handlerMaybe?: unknown): string {
    return 'mock-worker';
  }
}

export { PgBoss };
