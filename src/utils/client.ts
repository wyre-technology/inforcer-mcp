import { AsyncLocalStorage } from 'node:async_hooks';
import { InforcerClient } from '@wyre-technology/node-inforcer';
import { logger } from './logger.js';

export interface Credentials {
  region: string;
  apiKey: string;
}

// Request-scoped credential store. In gateway mode the HTTP layer runs each
// request inside runWithCredentials({region, apiKey}); getCredentials() reads it.
// Falls back to process.env for stdio/single-tenant mode.
const credStore = new AsyncLocalStorage<Credentials>();

export function runWithCredentials<T>(creds: Credentials, fn: () => T): T {
  return credStore.run(creds, fn);
}

/**
 * Read Inforcer credentials from the request scope (ALS) or fall back to
 * process.env for stdio/single-tenant mode.
 *
 * Both `region` and `apiKey` are required. Region is one of anz, eu, uk, us —
 * there is no default. Returns null (and warns) when either is missing so that
 * tool discovery (tools/list) still works unauthenticated.
 */
export function getCredentials(): Credentials | null {
  const scoped = credStore.getStore();
  if (scoped?.region && scoped?.apiKey) return scoped;

  const region = process.env.INFORCER_REGION;
  const apiKey = process.env.INFORCER_API_KEY;
  if (!region || !apiKey) {
    logger.warn('Missing credentials', { hasRegion: !!region, hasApiKey: !!apiKey });
    return null;
  }
  return { region, apiKey };
}

/**
 * Constructs an {@link InforcerClient} from the request-scoped (or env)
 * credentials. The client is cheap and holds no shared mutable state, so we
 * build one per call — never a process-global singleton.
 *
 * @throws when region or apiKey is missing.
 */
export function getClient(): InforcerClient {
  const creds = getCredentials();
  if (!creds) {
    throw new Error(
      'No Inforcer API credentials configured. Set INFORCER_REGION (anz, eu, uk, us) and INFORCER_API_KEY.'
    );
  }
  return new InforcerClient({
    region: creds.region as 'anz' | 'eu' | 'uk' | 'us',
    apiKey: creds.apiKey,
  });
}
