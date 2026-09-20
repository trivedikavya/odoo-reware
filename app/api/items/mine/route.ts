import { readCollection } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import type { Item } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const availableOnly = searchParams.get("availableOnly") === "true";

    const all = await readCollection<Item>("items");
    let mine = all.filter((i) => i.ownerId === user.id);
    if (availableOnly) {
      mine = mine.filter(
        (i) => i.status === "approved" && i.availability === "available"
      );
    }
    mine.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return jsonOk({ items: mine });
  } catch (err) {
    return handleApiError(err);
  }
}
