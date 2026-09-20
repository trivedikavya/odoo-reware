import { getCurrentUser } from "@/lib/session";
import { cancelSwap } from "@/lib/swaps";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError("Unauthorized", 401);

    const swap = await cancelSwap(params.id, user.id);
    return jsonOk({ swap });
  } catch (err) {
    return handleApiError(err);
  }
}
