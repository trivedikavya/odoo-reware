import Link from "next/link";
import { readCollection } from "@/lib/db";
import ItemCard from "@/components/ItemCard";
import type { Item } from "@/lib/types";

export default async function HomePage() {
  const items = await readCollection<Item>("items");
  const featured = items
    .filter((i) => i.status === "approved" && i.availability === "available")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page flex flex-col items-center py-20 text-center">
          <span className="badge-green mb-4">Sustainable Fashion, Reimagined</span>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Swap. Redeem. <span className="text-brand-600">Reduce waste.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-gray-600">
            ReWear connects you with a community exchanging unused clothing
            directly or through a simple points system — good for your closet,
            great for the planet.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Start Swapping
            </Link>
            <Link href="/items" className="btn-secondary px-6 py-3 text-base">
              Browse Items
            </Link>
            <Link href="/items/new" className="btn-outline px-6 py-3 text-base">
              List an Item
            </Link>
          </div>
        </div>
      </section>

      {/* Featured items */}
      <section className="container-page py-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Items</h2>
          <Link href="/items" className="text-sm font-medium text-brand-700 hover:underline">
            View all &rarr;
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-gray-500">No items available yet. Be the first to list one!</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {featured.map((item) => (
              <div key={item.id} className="w-48 flex-shrink-0 sm:w-56">
                <ItemCard item={item} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="bg-white py-16">
        <div className="container-page">
          <h2 className="mb-10 text-center text-2xl font-bold">How ReWear works</h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <Step
              icon="📸"
              title="List your item"
              description="Upload photos and details of clothing you no longer wear. Our team approves it in no time."
            />
            <Step
              icon="🔄"
              title="Swap or redeem"
              description="Offer one of your items in a direct swap, or use points earned from your own listings."
            />
            <Step
              icon="🌍"
              title="Reduce textile waste"
              description="Give clothes a second life and help build a more sustainable fashion community."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Step({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}
