import { InforcerClient } from '@wyre-technology/node-inforcer';
import { logger } from './logger.js';

let _client: InforcerClient | null = null;
let _credKey: string | null = null;

interface Credentials {
  region: string;
  apiKey: string;
}

/**
 * Read Inforcer credentials from the environment.
 *
 * Both `INFORCER_REGION` and `INFORCER_API_KEY` are required. Region is one of
 * anz, eu, uk, us — there is no default. Returns null (and warns) when either is
 * missing so that tool discovery (tools/list) still works unauthenticated.
 */
export function getCredentials(): Credentials | null {
  const region = process.env.INFORCER_REGION;
  const apiKey = process.env.INFORCER_API_KEY;
  if (!region || !apiKey) {
    logger.warn('Missing credentials', { hasRegion: !!region, hasApiKey: !!apiKey });
    return null;
  }
  return { region, apiKey };
}

/**
 * Lazily build (and cache) an {@link InforcerClient}. The cache is invalidated
 * automatically when the region/apiKey pair changes (e.g. per-request header
 * injection in gateway mode), and explicitly via {@link resetClient}.
 *
 * @throws when region or apiKey is missing (region is required by the SDK).
 */
export function getClient(): InforcerClient {
  const creds = getCredentials();
  if (!creds) {
    throw new Error(
      'No Inforcer API credentials configured. Set INFORCER_REGION (anz, eu, uk, us) and INFORCER_API_KEY.'
    );
  }

  const key = `${creds.region}:${creds.apiKey}`;
  if (_client && _credKey === key) return _client;

  _client = new InforcerClient({
    region: creds.region as 'anz' | 'eu' | 'uk' | 'us',
    apiKey: creds.apiKey,
  });
  _credKey = key;
  logger.info('Created Inforcer API client', { region: creds.region });
  return _client;
}

/**
 * Drop the cached client so the next {@link getClient} call rebuilds it. Called
 * after the HTTP transport injects fresh per-request credentials in gateway mode.
 */
export function resetClient(): void {
  _client = null;
  _credKey = null;
}
