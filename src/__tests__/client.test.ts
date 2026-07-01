import { describe, it, expect, afterEach } from 'vitest';
import { getCredentials, runWithCredentials } from '../utils/client.js';

describe('request-scoped credentials', () => {
  afterEach(() => {
    delete process.env.INFORCER_REGION;
    delete process.env.INFORCER_API_KEY;
  });

  it('prefers ALS-scoped creds over process.env', () => {
    process.env.INFORCER_REGION = 'us';
    process.env.INFORCER_API_KEY = 'env-key';
    expect(getCredentials()).toEqual({ region: 'us', apiKey: 'env-key' });

    runWithCredentials({ region: 'eu', apiKey: 'scoped-key' }, () => {
      expect(getCredentials()).toEqual({ region: 'eu', apiKey: 'scoped-key' });
    });

    // Scope did not leak out — env creds are back
    expect(getCredentials()).toEqual({ region: 'us', apiKey: 'env-key' });
  });

  it('returns null when neither scope nor env set', () => {
    expect(getCredentials()).toBeNull();
  });

  it('ALS-scoped creds do not bleed into a sibling async context', async () => {
    const results: Array<Credentials | null> = [];

    await Promise.all([
      runWithCredentials({ region: 'us', apiKey: 'tenant-a' }, async () => {
        await new Promise<void>(resolve => setTimeout(resolve, 10));
        results.push(getCredentials());
      }),
      runWithCredentials({ region: 'eu', apiKey: 'tenant-b' }, async () => {
        await new Promise<void>(resolve => setTimeout(resolve, 5));
        results.push(getCredentials());
      }),
    ]);

    // Both contexts resolved with their own credentials
    expect(results).toContainEqual({ region: 'us', apiKey: 'tenant-a' });
    expect(results).toContainEqual({ region: 'eu', apiKey: 'tenant-b' });
    // Neither tenant saw the other's key
    expect(results.some(c => c?.apiKey === 'tenant-a' && c?.region === 'eu')).toBe(false);
    expect(results.some(c => c?.apiKey === 'tenant-b' && c?.region === 'us')).toBe(false);
  });
});

// Re-export to satisfy TypeScript — type used in test assertions
type Credentials = { region: string; apiKey: string };
