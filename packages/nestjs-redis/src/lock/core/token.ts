import { randomBytes } from 'crypto';

/**
 * Default token length in characters.
 * Provides a good balance between security and performance.
 */
const DEFAULT_TOKEN_LENGTH = 22; // ~16 bytes of entropy when base64 encoded

/**
 * Generates a cryptographically secure random token for lock ownership.
 *
 * Uses Node crypto.randomBytes() to generate unpredictable tokens that
 * prevent lock hijacking. Tokens are base64-encoded for Redis storage.
 *
 * @param length - Desired length of the final token string. Must be positive.
 * @returns Base64-encoded random token string of the specified length.
 *
 * @throws {Error} When length is not positive.
 *
 * @example
 * ```typescript
 * // Generate token with default length (22 characters)
 * const token1 = generateToken();
 * console.log(token1.length); // 22
 *
 * // Generate longer token for higher security (32 characters)
 * const token2 = generateToken(32);
 * console.log(token2.length); // 32
 * ```
 *
 * @public
 */
export function generateToken(length: number = DEFAULT_TOKEN_LENGTH): string {
  if (length <= 0) {
    throw new Error('Token length must be positive');
  }

  // Calculate how many bytes we need to generate the desired string length
  //
  // Base64 encoding: 4 characters per 3 bytes, so we need (length * 3/4) bytes
  // Round up to ensure we have enough bytes
  const bytesNeeded = Math.ceil((length * 3) / 4);

  const buffer = randomBytes(bytesNeeded);
  const base64Token = buffer.toString('base64');

  // Trim to exact length requested (base64 might be slightly longer due to padding)
  return base64Token.substring(0, length);
}
