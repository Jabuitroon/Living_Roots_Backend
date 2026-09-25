import 'reflect-metadata';
import { DashboardCache, dashboardKeys, type CacheStore } from '../utils/dashboard.cache';

/** Store en memoria sin TTL: suficiente para probar la lógica de DashboardCache. */
class FakeStore implements CacheStore {
  readonly data = new Map<string, unknown>();
  async get<T>(key: string) {
    return this.data.get(key) as T | undefined;
  }
  async set(key: string, value: unknown) {
    this.data.set(key, value);
    return value;
  }
  async del(key: string) {
    this.data.delete(key);
    return true;
  }
}

const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('DashboardCache', () => {
  let store: FakeStore;
  let cache: DashboardCache;

  beforeEach(() => {
    store = new FakeStore();
    cache = new DashboardCache(store);
  });

  it('en frío calcula y guarda; en caliente no vuelve a calcular', async () => {
    const compute = jest.fn().mockResolvedValue({ herbs: 3 });
    const key = dashboardKeys.summary(30);

    expect(await cache.getOrCompute(key, compute)).toEqual({ herbs: 3 });
    expect(await cache.getOrCompute(key, compute)).toEqual({ herbs: 3 });

    expect(compute).toHaveBeenCalledTimes(1);
    expect(store.data.has(key)).toBe(true);
  });

  it('single-flight: peticiones concurrentes en frío comparten un cálculo', async () => {
    const gate = deferred<{ n: number }>();
    const compute = jest.fn().mockReturnValue(gate.promise);
    const key = dashboardKeys.health();

    const calls = Promise.all([
      cache.getOrCompute(key, compute),
      cache.getOrCompute(key, compute),
      cache.getOrCompute(key, compute),
    ]);
    await new Promise((r) => setImmediate(r)); // deja avanzar las lecturas de caché
    gate.resolve({ n: 1 });

    expect(await calls).toEqual([{ n: 1 }, { n: 1 }, { n: 1 }]);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('no cachea errores y permite reintentar', async () => {
    const key = dashboardKeys.summary(7);
    const failing = jest.fn().mockRejectedValue(new Error('BD caída'));
    await expect(cache.getOrCompute(key, failing)).rejects.toThrow('BD caída');
    expect(store.data.has(key)).toBe(false);

    const ok = jest.fn().mockResolvedValue({ herbs: 1 });
    expect(await cache.getOrCompute(key, ok)).toEqual({ herbs: 1 });
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("invalidate('chats') borra resumen y tendencia, y conserva salud y testimonios", async () => {
    const seed = async (key: string) => store.set(key, { seeded: true });
    await seed(dashboardKeys.summary(7));
    await seed(dashboardKeys.summary(90));
    await seed(dashboardKeys.trend(30, 'day'));
    await seed(dashboardKeys.trend(90, 'week'));
    await seed(dashboardKeys.health());
    await seed(dashboardKeys.testimonials(30));

    await cache.invalidate('chats');

    expect(store.data.has(dashboardKeys.summary(7))).toBe(false);
    expect(store.data.has(dashboardKeys.summary(90))).toBe(false);
    expect(store.data.has(dashboardKeys.trend(30, 'day'))).toBe(false);
    expect(store.data.has(dashboardKeys.trend(90, 'week'))).toBe(false);
    expect(store.data.has(dashboardKeys.health())).toBe(true);
    expect(store.data.has(dashboardKeys.testimonials(30))).toBe(true);
  });

  it.each([
    ['herbs', ['summary:30', 'health', 'testimonials:30'], ['trend']],
    ['stories', ['testimonials:30'], ['summary', 'health', 'trend']],
    ['catalog', ['health', 'testimonials:30'], ['summary', 'trend']],
    ['insights', ['testimonials:30'], ['summary', 'health', 'trend']],
  ] as const)('invalidate(%s) borra lo esperado', async (scope, gone, kept) => {
    const all = cache.allKeys();
    for (const k of all) await store.set(k, 1);

    await cache.invalidate(scope);

    for (const fragment of gone) {
      const matching = all.filter((k) => k.includes(fragment));
      expect(matching.length).toBeGreaterThan(0);
      matching.forEach((k) => expect(store.data.has(k)).toBe(false));
    }
    for (const fragment of kept) {
      all
        .filter((k) => k.includes(fragment) && !gone.some((g) => k.includes(g)))
        .forEach((k) => expect(store.data.has(k)).toBe(true));
    }
  });

  it('un cálculo en vuelo durante una invalidación no revive la entrada', async () => {
    const key = dashboardKeys.summary(30);
    const stale = deferred<{ herbs: number }>();
    const first = cache.getOrCompute(key, () => stale.promise);
    await new Promise((r) => setImmediate(r));

    await cache.invalidate('chats'); // llega un chat nuevo mientras se calculaba
    stale.resolve({ herbs: 1 }); // resultado calculado con datos previos
    expect(await first).toEqual({ herbs: 1 }); // quien lo pidió lo recibe...
    expect(store.data.has(key)).toBe(false); // ...pero no queda en caché

    const fresh = jest.fn().mockResolvedValue({ herbs: 2 });
    expect(await cache.getOrCompute(key, fresh)).toEqual({ herbs: 2 });
    expect(fresh).toHaveBeenCalledTimes(1);
  });

  it('tras invalidar, una petición nueva no se cuelga del cálculo antiguo', async () => {
    const key = dashboardKeys.health();
    const old = deferred<string>();
    const first = cache.getOrCompute(key, () => old.promise);
    await new Promise((r) => setImmediate(r));

    await cache.invalidate('catalog');
    const second = await cache.getOrCompute(key, async () => 'nuevo');
    expect(second).toBe('nuevo');

    old.resolve('viejo');
    expect(await first).toBe('viejo');
    expect(store.data.get(key)).toBe('nuevo'); // el viejo no pisó al nuevo
  });

  it('allKeys cubre todas las claves: 3 resumen + 6 tendencia + 3 testimonios + 1 salud', () => {
    const keys = cache.allKeys();
    expect(keys).toHaveLength(13);
    expect(new Set(keys).size).toBe(13);
  });

  it('invalidateAll deja el store vacío', async () => {
    for (const k of cache.allKeys()) await store.set(k, 1);
    await cache.invalidateAll();
    expect(store.data.size).toBe(0);
  });
});
