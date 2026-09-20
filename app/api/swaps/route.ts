import { NextRequest } from "next/server";
import { swapRequestSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { createSwapRequest } from "@/lib/swaps";
import { readCollection } from "@/lib/db";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import { checkSwapRateLimit } from "@/lib/rateLimit";
import type { Item, Swap, User } from "@/lib/types";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError("Unauthorized", 401);

    const [swaps, items, users] = await Promise.all([
      readCollection<Swap>("swaps"),
      readCollection<Item>("items"),
      readCollection<User>("users"),
    ]);
    const itemById = new Map(items.map((i) => [i.id, i]));
    const userById = new Map(users.map((u) => [u.id, u]));

    const enrich = (s: Swap) => ({
      ...s,
      item: itemById.get(s.itemId) ?? null,
      offeredItem: s.offeredItemId ? itemById.get(s.offeredItemId) ?? null : null,
      requesterName: userById.get(s.requesterId)?.name ?? "Unknown",
      ownerName: userById.get(s.ownerId)?.name ?? "Unknown",
    });

    const incoming = swaps
      .filter((s) => s.ownerId === user.id)
      .map(enrich)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const outgoing = swaps
      .filter((s) => s.requesterId === user.id)
      .map(enrich)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return jsonOk({ incoming, outgoing });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError("Unauthorized", 401);

    const rl = checkSwapRateLimit(user.id);
    if (!rl.allowed) {
      throw new HttpError(
        "You have reached the daily limit of 10 swap requests. Try again later.",
        429
      );
    }

    const body = await request.json().catch(() => ({}));
    const { itemId, kind, offeredItemId } = swapRequestSchema.parse(body);

    const swap = await createSwapRequest({
      requesterId: user.id,
      itemId,
      kind,
      offeredItemId: offeredItemId ?? null,
    });

    return jsonOk({ swap }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
