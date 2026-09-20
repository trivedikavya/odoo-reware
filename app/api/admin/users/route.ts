import { readCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import { computeAcceptanceRate } from "@/lib/swaps";
import type { User } from "@/lib/types";

export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") throw new HttpError("Forbidden", 403);

    const users = await readCollection<User>("users");
    const result = await Promise.all(
      users.map(async (u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        points: u.points,
        createdAt: u.createdAt,
        acceptanceRate: await computeAcceptanceRate(u.id),
      }))
    );
    result.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return jsonOk({ users: result });
  } catch (err) {
    return handleApiError(err);
  }
}
