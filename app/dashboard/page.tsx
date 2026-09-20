"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/apiClient";
import { formatDate, formatAcceptanceRate, statusBadgeClass, availabilityBadgeClass } from "@/lib/format";
import type { Item, PublicUser, Swap } from "@/lib/types";

interface EnrichedSwap extends Swap {
  item: Item | null;
  offeredItem: Item | null;
  requesterName: string;
  ownerName: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [incoming, setIncoming] = useState<EnrichedSwap[]>([]);
  const [outgoing, setOutgoing] = useState<EnrichedSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [meRes, itemsRes, swapsRes] = await Promise.all([
      apiFetch<{ user: PublicUser | null }>("/api/auth/me"),
      apiFetch<{ items: Item[] }>("/api/items/mine"),
      apiFetch<{ incoming: EnrichedSwap[]; outgoing: EnrichedSwap[] }>("/api/swaps"),
    ]);
    setUser(meRes.user);
    setMyItems(itemsRes.items);
    setIncoming(swapsRes.incoming);
    setOutgoing(swapsRes.outgoing);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAll();
      setLoading(false);
    })();
  }, [loadAll]);

  async function handleAction(
    swapId: string,
    action: "accept" | "reject" | "cancel"
  ) {
    setBusyId(swapId);
    try {
      await apiFetch(`/api/swaps/${swapId}/${action}`, { method: "POST" });
      toast.success(
        action === "accept"
          ? "Request accepted!"
          : action === "reject"
          ? "Request rejected"
          : "Request cancelled"
      );
      await loadAll();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="h-32 animate-pulse rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page py-20 text-center">
        <p>Please log in to view your dashboard.</p>
        <Link href="/login" className="btn-primary mt-4 inline-flex">Log in</Link>
      </div>
    );
  }

  const pendingIncoming = incoming.filter((s) => s.status === "pending");
  const pendingOutgoing = outgoing.filter((s) => s.status === "pending");
  const history = [...incoming, ...outgoing]
    .filter((s) => s.status !== "pending")
    .filter((s, idx, arr) => arr.findIndex((x) => x.id === s.id) === idx)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="container-page py-10">
      <h1 className="mb-6 text-3xl font-bold">My Dashboard</h1>

      {/* Profile */}
      <div className="card mb-8 grid grid-cols-1 gap-4 p-6 sm:grid-cols-4">
        <div>
          <p className="text-sm text-gray-500">Name</p>
          <p className="font-semibold">{user.name}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-semibold">{user.email}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Points balance</p>
          <p className="text-xl font-bold text-brand-700">{user.points}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Acceptance rate</p>
          <p className="font-semibold">{formatAcceptanceRate(user.acceptanceRate)}</p>
        </div>
      </div>

      {/* My Items */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">My Items</h2>
          <Link href="/items/new" className="btn-primary">+ List new item</Link>
        </div>
        {myItems.length === 0 ? (
          <p className="text-gray-500">You haven&apos;t listed any items yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {myItems.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="card overflow-hidden">
                <div className="relative aspect-square bg-gray-100">
                  {item.images[0] && (
                    <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 font-medium">{item.title}</p>
                  <div className="mt-1 flex gap-1">
                    <span className={statusBadgeClass(item.status)}>{item.status}</span>
                    <span className={availabilityBadgeClass(item.availability)}>{item.availability}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Incoming Requests */}
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-bold">Incoming Requests</h2>
        {pendingIncoming.length === 0 ? (
          <p className="text-gray-500">No pending requests on your items.</p>
        ) : (
          <div className="space-y-3">
            {pendingIncoming.map((s) => (
              <div key={s.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    <span className="text-brand-700">{s.requesterName}</span> wants{" "}
                    {s.item ? <Link href={`/items/${s.item.id}`} className="underline">{s.item.title}</Link> : "your item"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {s.kind === "points"
                      ? `Redeem via points (${s.pointsHeld} pts)`
                      : s.offeredItem
                      ? `Offering: ${s.offeredItem.title}`
                      : "Direct swap"}
                    {" "}&middot; {formatDate(s.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(s.id, "accept")}
                    disabled={busyId === s.id}
                    className="btn-primary"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleAction(s.id, "reject")}
                    disabled={busyId === s.id}
                    className="btn-outline"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Outgoing Requests */}
      <section className="mb-10">
        <h2 className="mb-3 text-xl font-bold">Outgoing Requests</h2>
        {pendingOutgoing.length === 0 ? (
          <p className="text-gray-500">You have no pending outgoing requests.</p>
        ) : (
          <div className="space-y-3">
            {pendingOutgoing.map((s) => (
              <div key={s.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    Request to{" "}
                    {s.item ? <Link href={`/items/${s.item.id}`} className="underline">{s.item.title}</Link> : "an item"}
                    {" "}from {s.ownerName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {s.kind === "points"
                      ? `Points held: ${s.pointsHeld}`
                      : s.offeredItem
                      ? `Offering: ${s.offeredItem.title}`
                      : "Direct swap"}
                    {" "}&middot; {formatDate(s.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleAction(s.id, "cancel")}
                  disabled={busyId === s.id}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 text-xl font-bold">Swap History</h2>
        {history.length === 0 ? (
          <p className="text-gray-500">No completed swaps yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((s) => {
              const isIncoming = s.ownerId === user.id;
              return (
                <div key={s.id} className="card flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      {s.item?.title ?? "Item removed"}{" "}
                      <span className={statusBadgeClass(s.status)}>{s.status}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {isIncoming ? `Requested by ${s.requesterName}` : `Owner: ${s.ownerName}`}
                      {" "}&middot; {s.kind === "points" ? `${s.pointsHeld} pts` : "direct swap"}
                      {" "}&middot; {formatDate(s.updatedAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
