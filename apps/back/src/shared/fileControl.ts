export interface FileControl<R> {
  execute(...args: any[]): Promise<R>;
}
