import { randomBytes } from 'crypto';

export function generateToken(): string {
  return randomBytes(16).toString('hex');
}
