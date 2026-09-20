"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/apiClient";
import { formatDate, formatAcceptanceRate, statusBadgeClass, availabilityBadgeClass } from "@/lib/format";
import type { Item } from "@/lib/types";

type Tab = "pending" | "all" | "users" | "stats";

interface AdminItem extends Item {
  ownerName: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  points: number;
  createdAt: string;
  acceptanceRate: number | null;
}

interface Stats {
  totalUsers: number;
  totalItems: number;
  pendingItems: number;
  approvedItems: number;
  rejectedItems: number;
  availableItems: number;
  swappedItems: number;
  totalSwaps: number;
  pendingSwaps: number;
  completedSwaps: number;
  rejectedSwaps: number;
  cancelledSwaps: number;
  pointsInCirculation: number;
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<AdminItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadItems = useCallback(async (status?: string) => {
    const qs = status ? `?status=${status}` : "";
    const data = await apiFetch<{ items: AdminItem[] }>(`/api/admin/items${qs}`);
    setItems(data.items);
  }, []);

  const loadUsers = useCallback(async () => {
    const data = await apiFetch<{ users: AdminUser[] }>("/api/admin/users");
    setUsers(data.users);
  }, []);

  const loadStats = useCallback(async () => {
    const data = await apiFetch<{ stats: Stats }>("/api/admin/stats");
    setStats(data.stats);
  }, []);

  const loadTab = useCallback(
    async (t: Tab) => {
      setLoading(true);
      try {
        if (t === "pending") await loadItems("pending");
        else if (t === "all") await loadItems();
        else if (t === "users") await loadUsers();
        else if (t === "stats") await loadStats();
      } finally {
        setLoading(false);
      }
    },
    [loadItems, loadUsers, loadStats]
  );

  useEffect(() => {
    loadTab(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleApprove(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/items/${id}/approve`, { method: "POST" });
      toast.success("Item approved");
      await loadTab(tab);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/items/${id}/reject`, { method: "POST" });
      toast.success("Item rejected");
      await loadTab(tab);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this item? Pending swaps on it will be cancelled and points refunded.")) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/items/${id}`, { method: "DELETE" });
      toast.success("Item removed");
      await loadTab(tab);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "pending", label: "Pending Items" },
    { key: "all", label: "All Items" },
    { key: "users", label: "Users" },
    { key: "stats", label: "Swap Overview" },
  ];

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-gray-200" />
      ) : (
        <>
          {(tab === "pending" || tab === "all") && (
            <div className="space-y-3">
              {items.length === 0 ? (
                <p className="text-gray-500">No items found.</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.images[0] && (
                        <Image src={item.images[0]} alt={item.title} fill className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        <Link href={`/items/${item.id}`} className="hover:underline">{item.title}</Link>
                      </p>
                      <p className="text-sm text-gray-500">
                        Owner: {item.ownerName} &middot; {item.category} &middot; Size {item.size} &middot; {formatDate(item.createdAt)}
                      </p>
                      <div className="mt-1 flex gap-2">
                        <span className={statusBadgeClass(item.status)}>{item.status}</span>
                        <span className={availabilityBadgeClass(item.availability)}>{item.availability}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={busyId === item.id}
                            className="btn-primary"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(item.id)}
                            disabled={busyId === item.id}
                            className="btn-outline"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleRemove(item.id)}
                        disabled={busyId === item.id}
                        className="btn-danger"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "users" && (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Points</th>
                    <th className="p-3">Acceptance rate</th>
                    <th className="p-3">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="p-3 font-medium">{u.name}</td>
                      <td className="p-3 text-gray-500">{u.email}</td>
                      <td className="p-3">
                        <span className={u.role === "admin" ? "badge-blue" : "badge-gray"}>{u.role}</span>
                      </td>
                      <td className="p-3">{u.points}</td>
                      <td className="p-3">{formatAcceptanceRate(u.acceptanceRate)}</td>
                      <td className="p-3 text-gray-500">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "stats" && stats && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <StatCard label="Total users" value={stats.totalUsers} />
              <StatCard label="Total items" value={stats.totalItems} />
              <StatCard label="Pending items" value={stats.pendingItems} />
              <StatCard label="Approved items" value={stats.approvedItems} />
              <StatCard label="Rejected items" value={stats.rejectedItems} />
              <StatCard label="Available items" value={stats.availableItems} />
              <StatCard label="Swapped items" value={stats.swappedItems} />
              <StatCard label="Total swaps" value={stats.totalSwaps} />
              <StatCard label="Pending swaps" value={stats.pendingSwaps} />
              <StatCard label="Completed swaps" value={stats.completedSwaps} />
              <StatCard label="Rejected swaps" value={stats.rejectedSwaps} />
              <StatCard label="Cancelled swaps" value={stats.cancelledSwaps} />
              <StatCard label="Points in circulation" value={stats.pointsInCirculation} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-brand-700">{value}</p>
    </div>
  );
}
