"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/apiClient";
import { availabilityBadgeClass, formatDate } from "@/lib/format";
import type { Item, PublicUser } from "@/lib/types";

interface OwnerInfo {
  id: string;
  name: string;
  createdAt: string;
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [owner, setOwner] = useState<OwnerInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<PublicUser | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [showSwapModal, setShowSwapModal] = useState(false);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [myItemsLoading, setMyItemsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadItem() {
    try {
      const data = await apiFetch<{ item: Item; owner: OwnerInfo | null }>(
        `/api/items/${params.id}`
      );
      setItem(data.item);
      setOwner(data.owner);
      setActiveImage(0);
    } catch {
      setNotFound(true);
    }
  }

  async function loadUser() {
    const data = await apiFetch<{ user: PublicUser | null }>("/api/auth/me");
    setCurrentUser(data.user);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadItem(), loadUser()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="grid animate-pulse grid-cols-1 gap-8 md:grid-cols-2">
          <div className="aspect-square rounded-xl bg-gray-200" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-24 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold">Item not found</h1>
        <p className="mt-2 text-gray-500">
          This item may have been removed or is not yet approved.
        </p>
        <Link href="/items" className="btn-primary mt-6 inline-flex">
          Back to browse
        </Link>
      </div>
    );
  }

  const isOwner = currentUser?.id === item.ownerId;
  const isAvailable = item.status === "approved" && item.availability === "available";
  const canInteract = !!currentUser && !isOwner && isAvailable;
  const canRedeemPoints = canInteract && currentUser!.points >= item.pointValue;

  async function openSwapModal() {
    if (!currentUser) {
      toast.error("Please log in to request a swap");
      router.push("/login");
      return;
    }
    setShowSwapModal(true);
    setMyItemsLoading(true);
    try {
      const data = await apiFetch<{ items: Item[] }>(
        "/api/items/mine?availableOnly=true"
      );
      setMyItems(data.items.filter((i) => i.id !== item!.id));
    } finally {
      setMyItemsLoading(false);
    }
  }

  async function submitSwapRequest() {
    if (!selectedOfferId) {
      toast.error("Select an item to offer");
      return;
    }
    setActionLoading(true);
    try {
      await apiFetch("/api/swaps", {
        method: "POST",
        body: JSON.stringify({
          itemId: item!.id,
          kind: "swap",
          offeredItemId: selectedOfferId,
        }),
      });
      toast.success("Swap request sent!");
      setShowSwapModal(false);
      setSelectedOfferId("");
      await loadItem();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function submitPointsRedemption() {
    if (!currentUser) {
      toast.error("Please log in to redeem via points");
      router.push("/login");
      return;
    }
    setActionLoading(true);
    try {
      await apiFetch("/api/swaps", {
        method: "POST",
        body: JSON.stringify({ itemId: item!.id, kind: "points" }),
      });
      toast.success("Redemption request sent! Points are on hold.");
      await Promise.all([loadItem(), loadUser()]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="container-page py-10">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
            {item.images[activeImage] ? (
              <Image
                src={item.images[activeImage]}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                No image
              </div>
            )}
            <span className={`absolute right-3 top-3 ${availabilityBadgeClass(item.availability)}`}>
              {item.availability}
            </span>
          </div>
          {item.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {item.images.map((img, idx) => (
                <button
                  key={img}
                  onClick={() => setActiveImage(idx)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                    idx === activeImage ? "border-brand-600" : "border-transparent"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold">{item.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
            <span>{item.category}</span>
            <span>&middot;</span>
            <span>{item.type}</span>
            <span>&middot;</span>
            <span>Size {item.size}</span>
            <span>&middot;</span>
            <span>{item.condition}</span>
          </div>

          <p className="mt-4 whitespace-pre-line text-gray-700">{item.description}</p>

          {item.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span key={tag} className="badge-gray">#{tag}</span>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3 rounded-lg bg-brand-50 px-4 py-3">
            <span className="text-2xl font-bold text-brand-700">{item.pointValue}</span>
            <span className="text-sm text-brand-800">points to redeem</span>
          </div>

          {owner && (
            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Listed by</p>
              <p className="font-semibold">{owner.name}</p>
              <p className="text-xs text-gray-400">Member since {formatDate(owner.createdAt)}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={openSwapModal}
              disabled={!canInteract || actionLoading}
              className="btn-primary flex-1"
              title={
                isOwner
                  ? "You cannot request your own item"
                  : !isAvailable
                  ? "This item is not available"
                  : ""
              }
            >
              Swap Request
            </button>
            <button
              onClick={submitPointsRedemption}
              disabled={!canRedeemPoints || actionLoading}
              className="btn-secondary flex-1"
              title={
                isOwner
                  ? "You cannot redeem your own item"
                  : !isAvailable
                  ? "This item is not available"
                  : !canInteract
                  ? "Log in to redeem"
                  : currentUser && currentUser.points < item.pointValue
                  ? "Insufficient points"
                  : ""
              }
            >
              Redeem via Points
            </button>
          </div>
          {!currentUser && (
            <p className="mt-2 text-sm text-gray-500">
              <Link href="/login" className="text-brand-700 underline">Log in</Link> to swap or redeem this item.
            </p>
          )}
        </div>
      </div>

      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-xl font-bold">Choose an item to offer</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select one of your available items to swap for &quot;{item.title}&quot;.
            </p>

            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {myItemsLoading ? (
                <p className="text-sm text-gray-500">Loading your items...</p>
              ) : myItems.length === 0 ? (
                <p className="text-sm text-gray-500">
                  You have no approved, available items to offer.{" "}
                  <Link href="/items/new" className="text-brand-700 underline">List one now</Link>.
                </p>
              ) : (
                myItems.map((mi) => (
                  <label
                    key={mi.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 ${
                      selectedOfferId === mi.id ? "border-brand-600 bg-brand-50" : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="offerItem"
                      checked={selectedOfferId === mi.id}
                      onChange={() => setSelectedOfferId(mi.id)}
                    />
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                      {mi.images[0] && (
                        <Image src={mi.images[0]} alt="" fill className="object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{mi.title}</p>
                      <p className="text-xs text-gray-500">{mi.pointValue} pts &middot; {mi.size}</p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={submitSwapRequest}
                disabled={actionLoading || !selectedOfferId}
                className="btn-primary flex-1"
              >
                {actionLoading ? "Sending..." : "Send Request"}
              </button>
              <button
                onClick={() => {
                  setShowSwapModal(false);
                  setSelectedOfferId("");
                }}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
