import { NextRequest } from "next/server";
import { readCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import type { Item, User } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new HttpError("Forbidden", 403);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const items = await readCollection<Item>("items");
    const users = await readCollection<User>("users");
    const ownerName = (id: string) =>
      users.find((u) => u.id === id)?.name ?? "Unknown";

    let filtered = items;
    if (status) filtered = filtered.filter((i) => i.status === status);
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const withOwner = filtered.map((i) => ({
      ...i,
      ownerName: ownerName(i.ownerId),
    }));

    return jsonOk({ items: withOwner });
  } catch (err) {
    return handleApiError(err);
  }
}
