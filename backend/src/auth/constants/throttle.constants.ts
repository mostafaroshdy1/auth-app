import type { Throttle } from '@nestjs/throttler';

export const AUTH_THROTTLE = {
  default: { limit: 10, ttl: 60_000, blockDuration: 5 * 60_000 },
} satisfies Parameters<typeof Throttle>[0];
