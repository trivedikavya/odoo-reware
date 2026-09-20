import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, SessionPayload, verifySession } from "./auth";
import { findById } from "./db";
import type { User, PublicUser } from "./types";
import { computeAcceptanceRate } from "./swaps";

/** Read & verify the session from the request cookies (server components & route handlers). */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Get the full current user record (with fresh data from disk), or null. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await findById<User>("users", session.sub);
  return user ?? null;
}

export function toPublicUser(
  user: User,
  acceptanceRate: number | null = null
): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    points: user.points,
    createdAt: user.createdAt,
    acceptanceRate,
  };
}

export async function toPublicUserWithRate(user: User): Promise<PublicUser> {
  const rate = await computeAcceptanceRate(user.id);
  return toPublicUser(user, rate);
}
