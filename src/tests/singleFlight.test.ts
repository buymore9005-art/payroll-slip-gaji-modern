import { describe, expect, it, vi } from 'vitest';
import { createSingleFlight } from '@/lib/singleFlight';

describe('createSingleFlight', () => {
  it('menggabungkan request paralel dengan key yang sama', async () => {
    let resolve!: (value: string) => void;
    const loader = vi.fn(() => new Promise<string>(next => { resolve = next; }));
    const load = createSingleFlight<string, string>(loader, key => key);

    const first = load('profile-1');
    const second = load('profile-1');
    expect(first).toBe(second);
    expect(loader).toHaveBeenCalledTimes(1);

    resolve('ok');
    await expect(first).resolves.toBe('ok');
  });

  it('memulai request baru setelah request sebelumnya selesai', async () => {
    const loader = vi.fn(async (key: string) => key);
    const load = createSingleFlight<string, string>(loader, key => key);
    await load('same');
    await load('same');
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
