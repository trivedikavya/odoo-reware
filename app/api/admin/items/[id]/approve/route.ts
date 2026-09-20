import { update } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import type { Item } from "@/lib/types";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new HttpError("Forbidden", 403);

    const updated = await update<Item>("items", params.id, (item) => ({
      ...item,
      status: "approved",
    }));
    if (!updated) throw new HttpError("Item not found", 404);

    return jsonOk({ item: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
