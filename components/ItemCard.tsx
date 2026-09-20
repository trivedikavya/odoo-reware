import Link from "next/link";
import Image from "next/image";
import type { Item } from "@/lib/types";
import { availabilityBadgeClass } from "@/lib/format";

export default function ItemCard({ item }: { item: Item }) {
  const image = item.images[0];

  return (
    <Link
      href={`/items/${item.id}`}
      className="card group flex flex-col overflow-hidden transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {image ? (
          <Image
            src={image}
            alt={item.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No image
          </div>
        )}
        <span
          className={`absolute right-2 top-2 ${availabilityBadgeClass(item.availability)}`}
        >
          {item.availability}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-1 font-semibold text-gray-900">{item.title}</h3>
        <p className="text-xs text-gray-500">
          {item.category} &middot; Size {item.size}
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-gray-500">{item.condition}</span>
          <span className="badge-blue">{item.pointValue} pts</span>
        </div>
      </div>
    </Link>
  );
}
