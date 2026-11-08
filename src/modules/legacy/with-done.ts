type Done = (err?: unknown) => void;

export function withDone(fn: (done: Done) => unknown): () => Promise<void> {
  return () =>
    new Promise<void>((resolve, reject) => {
      fn((err) => (err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve()));
    });
}
