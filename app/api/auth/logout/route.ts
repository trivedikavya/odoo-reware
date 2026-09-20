import { jsonOk } from "@/lib/api-utils";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const res = jsonOk({ success: true });
  res.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
