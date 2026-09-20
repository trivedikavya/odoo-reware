export type Role = "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  points: number;
  createdAt: string;
}

export type ItemStatus = "pending" | "approved" | "rejected";
export type ItemAvailability = "available" | "reserved" | "swapped";

export interface Item {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  type: string;
  size: string;
  condition: string;
  tags: string[];
  images: string[];
  pointValue: number;
  status: ItemStatus;
  availability: ItemAvailability;
  createdAt: string;
}

export type SwapKind = "swap" | "points";
export type SwapStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export interface Swap {
  id: string;
  itemId: string;
  ownerId: string;
  requesterId: string;
  kind: SwapKind;
  offeredItemId: string | null;
  pointsHeld: number;
  status: SwapStatus;
  createdAt: string;
  updatedAt: string;
}

/** Public-safe user shape (never leaks passwordHash). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  points: number;
  createdAt: string;
  acceptanceRate: number | null;
}
