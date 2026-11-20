import { z } from 'zod';

export const throttleScriptResult = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);

export const THROTTLE_SCRIPT = `
local hitsKey, blockKey = KEYS[1], KEYS[2]
local ttl, limit, blockDuration = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  return { tonumber(redis.call('GET', hitsKey) or limit + 1), redis.call('PTTL', hitsKey), 1, blockTtl }
end
local hits = redis.call('INCR', hitsKey)
if hits == 1 then redis.call('PEXPIRE', hitsKey, ttl) end
local hitsTtl = redis.call('PTTL', hitsKey)
if hits > limit then
  redis.call('SET', blockKey, 1, 'PX', blockDuration)
  return { hits, hitsTtl, 1, blockDuration }
end
return { hits, hitsTtl, 0, 0 }
`;
