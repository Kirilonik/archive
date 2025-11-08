import { TextEncoder, TextDecoder } from 'util';
import { jest as jestGlobals } from '@jest/globals';

declare global {
  // eslint-disable-next-line no-var
  var jest: typeof jestGlobals;
}

globalThis.jest = jestGlobals;

if (typeof (global as any).TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}

if (typeof (global as any).TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder as any;
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
process.env.KINOPOISK_API_KEY = process.env.KINOPOISK_API_KEY || 'test-kp-key';

