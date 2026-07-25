import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';

describe('deterministic Motion dependency stack', () => {
  it('pins compatible Motion packages and Vercel runtime', () => {
    expect(packageJson.dependencies['framer-motion']).toBe('12.42.2');
    expect(packageJson.overrides).toEqual({
      'motion-dom': '12.42.2',
      'motion-utils': '12.39.0',
    });
    expect(packageJson.engines.node).toBe('22.x');
    expect(packageJson.packageManager).toBe('npm@10.9.2');
  });
});
