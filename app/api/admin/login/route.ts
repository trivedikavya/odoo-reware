import { NextRequest } from "next/server";
import { adminLoginSchema } from "@/lib/schemas";
import { findOne } from "@/lib/db";
import { signSession, authCookieOptions } from "@/lib/auth";
import { comparePassword } from "@/lib/password";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import { checkLoginRateLimit, getClientIp } from "@/lib/rateLimit";
import type { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = adminLoginSchema.parse(body);

    const ip = getClientIp(request.headers);
    const rl = checkLoginRateLimit(ip, `admin:${email}`);
    if (!rl.allowed) {
      throw new HttpError(
        "Too many login attempts. Please try again later.",
        429
      );
    }

    const admin = await findOne<User>(
      "users",
      (u) => u.email === email && u.role === "admin"
    );

    const genericError = () => new HttpError("Invalid email or password", 401);
    if (!admin) throw genericError();

    const valid = await comparePassword(password, admin.passwordHash);
    if (!valid) throw genericError();

    const token = await signSession({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    });

    const res = jsonOk({
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        points: admin.points,
      },
    });
    res.cookies.set("rewear_token", token, authCookieOptions());
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
