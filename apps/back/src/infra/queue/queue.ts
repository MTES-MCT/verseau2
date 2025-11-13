export interface Queue<TData = object> {
  send(name: string, data?: TData): Promise<string | null>;
  work(name: string, handler: ([job]: TData[]) => Promise<unknown>): Promise<string>;
}

export enum QueueName {
  process_file = 'process_file',
}
