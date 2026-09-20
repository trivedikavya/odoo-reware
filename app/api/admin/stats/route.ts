import { readCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import type { Item, Swap, User } from "@/lib/types";

export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "admin") throw new HttpError("Forbidden", 403);

    const [items, swaps, users] = await Promise.all([
      readCollection<Item>("items"),
      readCollection<Swap>("swaps"),
      readCollection<User>("users"),
    ]);

    const pointsInCirculation = users
      .filter((u) => u.role === "user")
      .reduce((sum, u) => sum + u.points, 0);

    const stats = {
      totalUsers: users.filter((u) => u.role === "user").length,
      totalItems: items.length,
      pendingItems: items.filter((i) => i.status === "pending").length,
      approvedItems: items.filter((i) => i.status === "approved").length,
      rejectedItems: items.filter((i) => i.status === "rejected").length,
      availableItems: items.filter((i) => i.availability === "available").length,
      swappedItems: items.filter((i) => i.availability === "swapped").length,
      totalSwaps: swaps.length,
      pendingSwaps: swaps.filter((s) => s.status === "pending").length,
      completedSwaps: swaps.filter((s) => s.status === "completed").length,
      rejectedSwaps: swaps.filter((s) => s.status === "rejected").length,
      cancelledSwaps: swaps.filter((s) => s.status === "cancelled").length,
      pointsInCirculation,
    };

    return jsonOk({ stats });
  } catch (err) {
    return handleApiError(err);
  }
}
