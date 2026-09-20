"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CATEGORIES, SIZES, CONDITIONS } from "@/lib/schemas";

const MAX_IMAGES = 5;

export default function NewItemPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [type, setType] = useState("");
  const [size, setSize] = useState<string>(SIZES[0]);
  const [condition, setCondition] = useState<string>(CONDITIONS[0]);
  const [tags, setTags] = useState("");
  const [pointValue, setPointValue] = useState(50);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length + files.length > MAX_IMAGES) {
      toast.error(`You can upload at most ${MAX_IMAGES} images`);
      return;
    }
    const newFiles = [...files, ...selected];
    setFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }

  function removeImage(idx: number) {
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("Please add at least one image");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("description", description);
      formData.set("category", category);
      formData.set("type", type);
      formData.set("size", size);
      formData.set("condition", condition);
      formData.set("tags", tags);
      formData.set("pointValue", String(pointValue));
      files.forEach((f) => formData.append("images", f));

      const res = await fetch("/api/items", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to list item");

      toast.success("Item submitted for approval!");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="mb-2 text-3xl font-bold">List an Item</h1>
      <p className="mb-6 text-gray-500">
        New listings are reviewed by an admin before they appear publicly.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="label">Images (up to {MAX_IMAGES}, JPG/PNG/WEBP, max 5MB each)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFiles}
            className="input"
          />
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {previews.map((src, idx) => (
                <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-0 top-0 rounded-bl bg-black/60 px-1 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea
            id="description"
            className="input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="type">Type</label>
            <input id="type" className="input" placeholder="e.g. T-Shirt, Jeans" value={type} onChange={(e) => setType(e.target.value)} required />
          </div>
          <div>
            <label className="label">Size</label>
            <select className="input" value={size} onChange={(e) => setSize(e.target.value)}>
              {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Condition</label>
            <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tags">Tags (comma-separated)</label>
          <input id="tags" className="input" placeholder="denim, vintage, summer" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <div>
          <label className="label" htmlFor="pointValue">Point value</label>
          <input
            id="pointValue"
            type="number"
            className="input"
            min={5}
            max={1000}
            value={pointValue}
            onChange={(e) => setPointValue(Number(e.target.value))}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Submitting..." : "Submit for review"}
        </button>
      </form>
    </div>
  );
}
