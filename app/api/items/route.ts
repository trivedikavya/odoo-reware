import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { readCollection, insert } from "@/lib/db";
import { itemCreateSchema, CATEGORIES, SIZES, CONDITIONS } from "@/lib/schemas";
import { saveUploadedImages } from "@/lib/upload";
import { getCurrentUser } from "@/lib/session";
import { jsonOk, handleApiError, HttpError } from "@/lib/api-utils";
import type { Item } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
    const category = searchParams.get("category") ?? "";
    const size = searchParams.get("size") ?? "";
    const condition = searchParams.get("condition") ?? "";

    const all = await readCollection<Item>("items");
    let filtered = all.filter(
      (i) => i.status === "approved"
    );

    if (search) {
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(search) ||
          i.description.toLowerCase().includes(search) ||
          i.tags.some((t) => t.toLowerCase().includes(search))
      );
    }
    if (category) filtered = filtered.filter((i) => i.category === category);
    if (size) filtered = filtered.filter((i) => i.size === size);
    if (condition) filtered = filtered.filter((i) => i.condition === condition);

    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return jsonOk({ items: filtered, meta: { categories: CATEGORIES, sizes: SIZES, conditions: CONDITIONS } });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new HttpError("Unauthorized", 401);

    const formData = await request.formData();

    const rawTags = formData.get("tags");
    let tags: string[] = [];
    if (typeof rawTags === "string" && rawTags.trim()) {
      tags = rawTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const parsed = itemCreateSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      type: formData.get("type"),
      size: formData.get("size"),
      condition: formData.get("condition"),
      tags,
      pointValue: formData.get("pointValue"),
    });

    const files = formData.getAll("images").filter((f): f is File => f instanceof File);
    const images = await saveUploadedImages(files);

    const item: Item = {
      id: uuidv4(),
      ownerId: user.id,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      type: parsed.type,
      size: parsed.size,
      condition: parsed.condition,
      tags: parsed.tags,
      images,
      pointValue: parsed.pointValue,
      status: "pending",
      availability: "available",
      createdAt: new Date().toISOString(),
    };

    await insert<Item>("items", item);

    return jsonOk({ item }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
