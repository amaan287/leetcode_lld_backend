export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelay = 300
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * 2 ** i;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
