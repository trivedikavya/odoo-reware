import { getCurrentUser } from "@/lib/session";
import { toPublicUserWithRate } from "@/lib/session";
import { jsonOk } from "@/lib/api-utils";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonOk({ user: null });
  }
  const publicUser = await toPublicUserWithRate(user);
  return jsonOk({ user: publicUser });
}
