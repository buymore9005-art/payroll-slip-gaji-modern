export function createSingleFlight<Key, Value>(
  loader: (key: Key) => Promise<Value>,
  serialize: (key: Key) => string = key => JSON.stringify(key),
) {
  const inflight = new Map<string, Promise<Value>>();
  return (key: Key): Promise<Value> => {
    const cacheKey = serialize(key);
    const existing = inflight.get(cacheKey);
    if (existing) return existing;
    const request = loader(key).finally(() => {
      if (inflight.get(cacheKey) === request) inflight.delete(cacheKey);
    });
    inflight.set(cacheKey, request);
    return request;
  };
}
