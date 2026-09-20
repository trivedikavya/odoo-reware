import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { signupSchema } from "@/lib/schemas";
import { findOne, insert } from "@/lib/db";
import { signSession, authCookieOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import type { User } from "@/lib/types";

const STARTING_POINTS = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, password } = signupSchema.parse(body);

    const existing = await findOne<User>(
      "users",
      (u) => u.email === email
    );
    if (existing) {
      throw new HttpError("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);
    const user: User = {
      id: uuidv4(),
      name,
      email,
      passwordHash,
      role: "user",
      points: STARTING_POINTS,
      createdAt: new Date().toISOString(),
    };
    await insert<User>("users", user);

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
