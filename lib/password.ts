import bcrypt from "bcryptjs";

/**
 * Password hashing lives in its own module (separate from lib/auth.ts)
 * because bcryptjs uses Node-only APIs (process.nextTick/setImmediate)
 * that are not supported in the Edge Runtime. lib/auth.ts is imported by
 * middleware.ts (which runs on the Edge Runtime) for JWT verification, so
 * it must never transitively import bcryptjs.
 */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
