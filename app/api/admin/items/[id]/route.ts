import { getCurrentUser } from "@/lib/session";
import { adminRemoveItem } from "@/lib/swaps";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new HttpError("Forbidden", 403);

    await adminRemoveItem(params.id);

    return jsonOk({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
