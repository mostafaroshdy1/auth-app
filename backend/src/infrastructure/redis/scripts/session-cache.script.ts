/**
 * Cache invariant: an active-session snapshot may never overwrite the revoked
 * marker. `markRevoked` is the only unconditional writer, so revocation always
 * wins regardless of how it interleaves with a cache repopulation.
 */
export const SET_ACTIVE_IF_NOT_REVOKED_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local ttl = tonumber(ARGV[2])
local revoked = ARGV[3]
if current == revoked then return 0 end
if ttl <= 0 then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ttl)
return 1
`;

export const REPLACE_ACTIVE_IF_NOT_REVOKED_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local revoked = ARGV[2]
if (not current) or current == revoked then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'KEEPTTL')
return 1
`;
