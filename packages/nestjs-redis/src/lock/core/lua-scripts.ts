/**
 * Lua script for atomically acquiring locks on multiple resources.
 *
 * Checks if any of the keys already exist, and if not, sets all of them atomically.
 * This ensures all-or-nothing acquisition across multiple resources.
 *
 * @param KEYS[1..n] - Lock key names
 * @param ARGV[1] - Token value to store
 * @param ARGV[2] - TTL in milliseconds
 *
 * @returns Number of keys successfully acquired (should equal #KEYS for success)
 *
 * @public
 */
export const ACQUIRE_SCRIPT = `
local token = ARGV[1]
local ttlMs = ARGV[2]

-- Check if any of the keys exist
if redis.call("EXISTS", unpack(KEYS)) > 0 then
  return 0
end

-- All keys are free, set them
for i = 1, #KEYS do
  redis.call("SET", KEYS[i], token, "PX", ttlMs)
end

return 1
`.trim();

/**
 * Lua script for atomically releasing locks on multiple resources.
 *
 * Verifies token ownership before deleting each lock to prevent unauthorized releases.
 * Only removes locks that match the provided token.
 *
 * @param KEYS[1..n] - Lock key names
 * @param ARGV[1] - Expected token value for ownership verification
 *
 * @returns Number of locks successfully released
 *
 * @public
 */
export const RELEASE_SCRIPT = `
local token = ARGV[1]
local count = 0

for i = 1, #KEYS do
  if redis.call("GET", KEYS[i]) == token then
    redis.call("DEL", KEYS[i])
    count = count + 1
  end
end

return count
`.trim();

/**
 * Lua script for atomically extending TTL on multiple resources.
 *
 * Verifies token ownership before updating expiration time on each lock.
 * Only extends locks that match the provided token.
 *
 * @param KEYS[1..n] - Lock key names
 * @param ARGV[1] - Expected token value for ownership verification
 * @param ARGV[2] - New TTL in milliseconds
 *
 * @returns Number of locks successfully extended
 *
 * @public
 */
export const EXTEND_SCRIPT = `
-- Check if all keys have the expected token value
local token = ARGV[1]
local ttl = ARGV[2]
local values = redis.call("MGET", unpack(KEYS))

for _, currValue in ipairs(values) do
  if currValue ~= token then
    return 0
  end
end

-- All matched, update TTLs
for _, key in ipairs(KEYS) do
  redis.call("SET", key, token, "PX", ttl)
end

return 1
`.trim();
