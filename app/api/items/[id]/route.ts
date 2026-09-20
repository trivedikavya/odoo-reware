import { findById, readCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import type { Item, User } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const item = await findById<Item>("items", params.id);
    if (!item) throw new HttpError("Item not found", 404);

    const viewer = await getCurrentUser();
    const isOwner = viewer?.id === item.ownerId;
    const isAdmin = viewer?.role === "admin";

    if (item.status !== "approved" && !isOwner && !isAdmin) {
      throw new HttpError("Item not found", 404);
    }

    const owner = await findById<User>("users", item.ownerId);

    return jsonOk({
      item,
      owner: owner
        ? { id: owner.id, name: owner.name, createdAt: owner.createdAt }
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
