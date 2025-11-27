export interface AsyncTask<R> {
  process(data: R): Promise<void>;
}
