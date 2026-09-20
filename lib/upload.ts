import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { HttpError } from "./api-utils";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function saveUploadedImages(files: File[]): Promise<string[]> {
  const realFiles = files.filter((f) => f && f.size > 0);
  if (realFiles.length === 0) {
    throw new HttpError("At least one image is required", 400);
  }
  if (realFiles.length > MAX_IMAGES) {
    throw new HttpError(`You can upload at most ${MAX_IMAGES} images`, 400);
  }

  for (const file of realFiles) {
    if (!ALLOWED_TYPES[file.type]) {
      throw new HttpError(
        "Only JPG, PNG, and WEBP images are allowed",
        400
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new HttpError("Each image must be 5MB or smaller", 400);
    }
  }

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const savedPaths: string[] = [];
  for (const file of realFiles) {
    const ext = ALLOWED_TYPES[file.type];
    const filename = `${uuidv4()}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    savedPaths.push(`/uploads/${filename}`);
  }

  return savedPaths;
}
