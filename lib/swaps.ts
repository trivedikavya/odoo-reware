import { v4 as uuidv4 } from "uuid";
import { withTransaction, readCollection } from "./db";
import { HttpError } from "./api-utils";
import type { Item, Swap, User } from "./types";

/* -------------------------------------------------------------------------
 * Read-only helpers
 * ---------------------------------------------------------------------- */

/** accepted / total received requests for a user acting as item owner. Null if none received yet. */
export async function computeAcceptanceRate(
  userId: string
): Promise<number | null> {
  const swaps = await readCollection<Swap>("swaps");
  const received = swaps.filter((s) => s.ownerId === userId);
  if (received.length === 0) return null;
  const accepted = received.filter((s) => s.status === "completed").length;
  return accepted / received.length;
}

/* -------------------------------------------------------------------------
 * Create swap request
 * ---------------------------------------------------------------------- */

export interface CreateSwapArgs {
  requesterId: string;
  itemId: string;
  kind: "swap" | "points";
  offeredItemId?: string | null;
}

export async function createSwapRequest(args: CreateSwapArgs): Promise<Swap> {
  const { requesterId, itemId, kind } = args;
  const offeredItemId = args.offeredItemId ?? null;

  return withTransaction(async (db) => {
    const items = await db.read<Item>("items");
    const users = await db.read<User>("users");
    const swaps = await db.read<Swap>("swaps");

    const item = items.find((i) => i.id === itemId);
    if (!item) throw new HttpError("Item not found", 404);
    if (item.status !== "approved") {
      throw new HttpError("This item is not available for requests", 400);
    }
    if (item.availability !== "available") {
      throw new HttpError("This item is no longer available", 400);
    }
    if (item.ownerId === requesterId) {
      throw new HttpError("You cannot request your own item", 400);
    }

    const duplicate = swaps.find(
      (s) =>
        s.itemId === itemId &&
        s.requesterId === requesterId &&
        s.status === "pending"
    );
    if (duplicate) {
      throw new HttpError(
        "You already have an active request for this item",
        400
      );
    }

    const requester = users.find((u) => u.id === requesterId);
    if (!requester) throw new HttpError("Requester not found", 404);

    let pointsHeld = 0;
    let resolvedOfferedItemId: string | null = null;

    if (kind === "points") {
      if (requester.points < item.pointValue) {
        throw new HttpError("Insufficient points", 400);
      }
      pointsHeld = item.pointValue;
    } else {
      if (!offeredItemId) {
        throw new HttpError(
          "Please select one of your items to offer",
          400
        );
      }
      const offered = items.find((i) => i.id === offeredItemId);
      if (!offered) throw new HttpError("Offered item not found", 404);
      if (offered.ownerId !== requesterId) {
        throw new HttpError("You can only offer your own items", 400);
      }
      if (offered.status !== "approved" || offered.availability !== "available") {
        throw new HttpError("Offered item is not available", 400);
      }
      if (offered.id === item.id) {
        throw new HttpError("Cannot offer the same item", 400);
      }
      resolvedOfferedItemId = offered.id;
    }

    const now = new Date().toISOString();
    const swap: Swap = {
      id: uuidv4(),
      itemId: item.id,
      ownerId: item.ownerId,
      requesterId,
      kind,
      offeredItemId: resolvedOfferedItemId,
      pointsHeld,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    if (kind === "points") {
      const reqIdx = users.findIndex((u) => u.id === requesterId);
      users[reqIdx] = {
        ...users[reqIdx],
        points: users[reqIdx].points - pointsHeld,
      };
      await db.write("users", users);
    }

    swaps.push(swap);
    await db.write("swaps", swaps);

    return swap;
  });
}

/* -------------------------------------------------------------------------
 * Accept swap
 * ---------------------------------------------------------------------- */

export async function acceptSwap(
  swapId: string,
  actingUserId: string
): Promise<Swap> {
  return withTransaction(async (db) => {
    const swaps = await db.read<Swap>("swaps");
    const items = await db.read<Item>("items");
    const users = await db.read<User>("users");

    const swapIdx = swaps.findIndex((s) => s.id === swapId);
    if (swapIdx === -1) throw new HttpError("Swap request not found", 404);
    const swap = swaps[swapIdx];

    if (swap.ownerId !== actingUserId) {
      throw new HttpError("Only the item owner can accept this request", 403);
    }
    if (swap.status !== "pending") {
      throw new HttpError("This request is no longer pending", 400);
    }

    const itemIdx = items.findIndex((i) => i.id === swap.itemId);
    if (itemIdx === -1) throw new HttpError("Item not found", 404);
    const item = items[itemIdx];
    if (item.availability !== "available") {
      throw new HttpError("Item is no longer available", 400);
    }

    if (swap.kind === "points") {
      const ownerIdx = users.findIndex((u) => u.id === swap.ownerId);
      if (ownerIdx === -1) throw new HttpError("Owner not found", 404);
      users[ownerIdx] = {
        ...users[ownerIdx],
        points: users[ownerIdx].points + swap.pointsHeld,
      };
      items[itemIdx] = { ...item, availability: "swapped" };
    } else {
      if (!swap.offeredItemId) {
        throw new HttpError("Offered item missing on swap record", 400);
      }
      const offeredIdx = items.findIndex((i) => i.id === swap.offeredItemId);
      if (offeredIdx === -1) {
        throw new HttpError("Offered item no longer exists", 400);
      }
      const offered = items[offeredIdx];
      if (
        offered.ownerId !== swap.requesterId ||
        offered.status !== "approved" ||
        offered.availability !== "available"
      ) {
        throw new HttpError("Offered item is no longer available", 400);
      }
      items[itemIdx] = { ...item, availability: "swapped" };
      items[offeredIdx] = { ...offered, availability: "swapped" };
    }

    const now = new Date().toISOString();
    swaps[swapIdx] = { ...swap, status: "completed", updatedAt: now };

    // Auto-reject every other pending request on the same item, refunding
    // any held points.
    for (let i = 0; i < swaps.length; i++) {
      const other = swaps[i];
      if (
        other.id !== swap.id &&
        other.itemId === swap.itemId &&
        other.status === "pending"
      ) {
        if (other.kind === "points" && other.pointsHeld > 0) {
          const uIdx = users.findIndex((u) => u.id === other.requesterId);
          if (uIdx !== -1) {
            users[uIdx] = {
              ...users[uIdx],
              points: users[uIdx].points + other.pointsHeld,
            };
          }
        }
        swaps[i] = { ...other, status: "rejected", updatedAt: now };
      }
    }

    await db.write("users", users);
    await db.write("items", items);
    await db.write("swaps", swaps);

    return swaps[swapIdx];
  });
}

/* -------------------------------------------------------------------------
 * Reject swap (owner declines an incoming request)
 * ---------------------------------------------------------------------- */

export async function rejectSwap(
  swapId: string,
  actingUserId: string
): Promise<Swap> {
  return withTransaction(async (db) => {
    const swaps = await db.read<Swap>("swaps");
    const users = await db.read<User>("users");

    const swapIdx = swaps.findIndex((s) => s.id === swapId);
    if (swapIdx === -1) throw new HttpError("Swap request not found", 404);
    const swap = swaps[swapIdx];

    if (swap.ownerId !== actingUserId) {
      throw new HttpError("Only the item owner can reject this request", 403);
    }
    if (swap.status !== "pending") {
      throw new HttpError("This request is no longer pending", 400);
    }

    if (swap.kind === "points" && swap.pointsHeld > 0) {
      const uIdx = users.findIndex((u) => u.id === swap.requesterId);
      if (uIdx !== -1) {
        users[uIdx] = {
          ...users[uIdx],
          points: users[uIdx].points + swap.pointsHeld,
        };
        await db.write("users", users);
      }
    }

    const now = new Date().toISOString();
    swaps[swapIdx] = { ...swap, status: "rejected", updatedAt: now };
    await db.write("swaps", swaps);

    return swaps[swapIdx];
  });
}

/* -------------------------------------------------------------------------
 * Cancel swap (requester cancels their own outgoing request)
 * ---------------------------------------------------------------------- */

export async function cancelSwap(
  swapId: string,
  actingUserId: string
): Promise<Swap> {
  return withTransaction(async (db) => {
    const swaps = await db.read<Swap>("swaps");
    const users = await db.read<User>("users");

    const swapIdx = swaps.findIndex((s) => s.id === swapId);
    if (swapIdx === -1) throw new HttpError("Swap request not found", 404);
    const swap = swaps[swapIdx];

    if (swap.requesterId !== actingUserId) {
      throw new HttpError("Only the requester can cancel this request", 403);
    }
    if (swap.status !== "pending") {
      throw new HttpError("This request is no longer pending", 400);
    }

    if (swap.kind === "points" && swap.pointsHeld > 0) {
      const uIdx = users.findIndex((u) => u.id === swap.requesterId);
      if (uIdx !== -1) {
        users[uIdx] = {
          ...users[uIdx],
          points: users[uIdx].points + swap.pointsHeld,
        };
        await db.write("users", users);
      }
    }

    const now = new Date().toISOString();
    swaps[swapIdx] = { ...swap, status: "cancelled", updatedAt: now };
    await db.write("swaps", swaps);

    return swaps[swapIdx];
  });
}

/* -------------------------------------------------------------------------
 * Admin: remove an item, cascading cancellation + refunds for pending swaps
 * ---------------------------------------------------------------------- */

export async function adminRemoveItem(itemId: string): Promise<void> {
  return withTransaction(async (db) => {
    const items = await db.read<Item>("items");
    const swaps = await db.read<Swap>("swaps");
    const users = await db.read<User>("users");

    const itemIdx = items.findIndex((i) => i.id === itemId);
    if (itemIdx === -1) throw new HttpError("Item not found", 404);

    const now = new Date().toISOString();
    let usersChanged = false;

    for (let i = 0; i < swaps.length; i++) {
      const s = swaps[i];
      if (
        s.status === "pending" &&
        (s.itemId === itemId || s.offeredItemId === itemId)
      ) {
        if (s.kind === "points" && s.pointsHeld > 0) {
          const uIdx = users.findIndex((u) => u.id === s.requesterId);
          if (uIdx !== -1) {
            users[uIdx] = {
              ...users[uIdx],
              points: users[uIdx].points + s.pointsHeld,
            };
            usersChanged = true;
          }
        }
        swaps[i] = { ...s, status: "cancelled", updatedAt: now };
      }
    }

    items.splice(itemIdx, 1);

    if (usersChanged) await db.write("users", users);
    await db.write("swaps", swaps);
    await db.write("items", items);
  });
}
