"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ItemCard from "@/components/ItemCard";
import { CATEGORIES, SIZES, CONDITIONS } from "@/lib/schemas";
import type { Item } from "@/lib/types";

export default function BrowsePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [size, setSize] = useState(searchParams.get("size") ?? "");
  const [condition, setCondition] = useState(searchParams.get("condition") ?? "");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (size) params.set("size", size);
    if (condition) params.set("condition", condition);

    router.replace(`/items?${params.toString()}`, { scroll: false });

    const res = await fetch(`/api/items?${params.toString()}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, size, condition]);

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchItems();
  }

  function clearFilters() {
    setSearch("");
    setCategory("");
    setSize("");
    setCondition("");
    setTimeout(fetchItems, 0);
  }

  return (
    <div className="container-page py-10">
      <h1 className="mb-2 text-3xl font-bold">Browse Items</h1>
      <p className="mb-6 text-gray-500">
        Discover pre-loved clothing ready for a new home.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mb-8 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <input
          className="input lg:col-span-2"
          placeholder="Search title, description, tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="input" value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">All sizes</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button type="submit" className="btn-primary">Apply filters</button>
          <button type="button" onClick={clearFilters} className="btn-outline">Clear</button>
        </div>
      </form>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-gray-700">No items found</p>
          <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
