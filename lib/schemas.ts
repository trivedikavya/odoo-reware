import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const CATEGORIES = [
  "Tops",
  "Bottoms",
  "Dresses",
  "Outerwear",
  "Footwear",
  "Accessories",
  "Activewear",
] as const;

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const CONDITIONS = [
  "New with tags",
  "Like new",
  "Good",
  "Fair",
] as const;

export const itemCreateSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000),
  category: z.enum(CATEGORIES),
  type: z.string().trim().min(1, "Type is required").max(60),
  size: z.enum(SIZES),
  condition: z.enum(CONDITIONS),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  pointValue: z.coerce.number().int().min(5).max(1000),
});

export const swapRequestSchema = z.object({
  itemId: z.string().min(1),
  kind: z.enum(["swap", "points"]),
  offeredItemId: z.string().min(1).nullable().optional(),
});

export const adminItemActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type SwapRequestInput = z.infer<typeof swapRequestSchema>;
