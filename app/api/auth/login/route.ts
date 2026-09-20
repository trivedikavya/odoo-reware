import { NextRequest } from "next/server";
import { loginSchema } from "@/lib/schemas";
import { findOne } from "@/lib/db";
import { signSession, authCookieOptions } from "@/lib/auth";
import { comparePassword } from "@/lib/password";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import { checkLoginRateLimit, getClientIp } from "@/lib/rateLimit";
import type { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = loginSchema.parse(body);

    const ip = getClientIp(request.headers);
    const rl = checkLoginRateLimit(ip, email);
    if (!rl.allowed) {
      throw new HttpError(
        "Too many login attempts. Please try again later.",
        429
      );
    }

    const user = await findOne<User>(
      "users",
      (u) => u.email === email && u.role === "user"
    );

    const genericError = () => new HttpError("Invalid email or password", 401);

    if (!user) throw genericError();

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw genericError();

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const res = jsonOk({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
      },
    });
    res.cookies.set("rewear_token", token, authCookieOptions());
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
