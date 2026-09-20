/**
 * Seed script — populates data/users.json, data/items.json, data/swaps.json
 * with a realistic demo dataset: 1 admin, 3 users, ~12 items, and a handful
 * of swaps in different states, so the demo looks alive immediately.
 *
 * Run with: npm run seed
 */
import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import type { User, Item, Swap } from "../lib/types";

/* ---------------------------------------------------------------------- */
/* Minimal .env loader (no extra dependency needed)                       */
/* ---------------------------------------------------------------------- */
async function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  try {
    const raw = await fs.readFile(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env not found — rely on defaults below.
  }
}

const DATA_DIR = path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function svgPlaceholder(label: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  <rect width="640" height="640" fill="${color}"/>
  <text x="320" y="320" font-size="42" fill="#ffffff" font-family="Verdana, sans-serif" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

async function saveSeedImage(slug: string, label: string, color: string): Promise<string> {
  const filename = `seed-${slug}.svg`;
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, svgPlaceholder(label, color), "utf-8");
  return `/uploads/${filename}`;
}

async function writeJson(name: string, data: unknown[]) {
  await fs.writeFile(
    path.join(DATA_DIR, `${name}.json`),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

const now = () => new Date().toISOString();
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

async function main() {
  await loadEnvFile();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@rewear.com").toLowerCase().trim();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345";

  console.log("Seeding ReWear demo data...");

  const passwordHash = await bcrypt.hash("password123", 10);
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const adminId = uuidv4();
  const aliceId = uuidv4();
  const bobId = uuidv4();
  const claraId = uuidv4();

  const users: User[] = [
    {
      id: adminId,
      name: "ReWear Admin",
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "admin",
      points: 0,
      createdAt: daysAgo(60),
    },
    {
      id: aliceId,
      name: "Alice Nguyen",
      email: "alice@demo.com",
      passwordHash,
      role: "user",
      points: 100,
      createdAt: daysAgo(45),
    },
    {
      id: bobId,
      name: "Bob Martinez",
      email: "bob@demo.com",
      passwordHash,
      role: "user",
      points: 100,
      createdAt: daysAgo(40),
    },
    {
      id: claraId,
      name: "Clara Osei",
      email: "clara@demo.com",
      passwordHash,
      role: "user",
      points: 100,
      createdAt: daysAgo(35),
    },
  ];

  // ------------------------------------------------------------------
  // Items (~12 across categories, owned by the 3 demo users)
  // ------------------------------------------------------------------
  type SeedItemDef = {
    ownerId: string;
    title: string;
    description: string;
    category: string;
    type: string;
    size: string;
    condition: string;
    tags: string[];
    pointValue: number;
    status: "pending" | "approved" | "rejected";
    availability: "available" | "reserved" | "swapped";
    color: string;
    createdAgoDays: number;
  };

  const itemDefs: SeedItemDef[] = [
    {
      ownerId: aliceId,
      title: "Denim Jacket",
      description: "Classic blue denim jacket, barely worn, great for layering in fall.",
      category: "Outerwear",
      type: "Jacket",
      size: "M",
      condition: "Like new",
      tags: ["denim", "jacket", "casual"],
      pointValue: 80,
      status: "approved",
      availability: "available",
      color: "#3b82f6",
      createdAgoDays: 20,
    },
    {
      ownerId: aliceId,
      title: "Floral Summer Dress",
      description: "Light floral dress, perfect for summer outings. Worn twice.",
      category: "Dresses",
      type: "Dress",
      size: "S",
      condition: "Like new",
      tags: ["floral", "summer", "dress"],
      pointValue: 60,
      status: "approved",
      availability: "available",
      color: "#ec4899",
      createdAgoDays: 18,
    },
    {
      ownerId: aliceId,
      title: "White Sneakers",
      description: "Comfortable white sneakers, minor scuffing on the toe.",
      category: "Footwear",
      type: "Sneakers",
      size: "M",
      condition: "Good",
      tags: ["sneakers", "shoes", "white"],
      pointValue: 45,
      status: "approved",
      availability: "available",
      color: "#e5e7eb",
      createdAgoDays: 15,
    },
    {
      ownerId: aliceId,
      title: "Wool Scarf (needs review)",
      description: "Cozy wool scarf in burgundy, brand new with tags.",
      category: "Accessories",
      type: "Scarf",
      size: "M",
      condition: "New with tags",
      tags: ["scarf", "wool", "winter"],
      pointValue: 25,
      status: "pending",
      availability: "available",
      color: "#7c2d12",
      createdAgoDays: 1,
    },
    {
      ownerId: bobId,
      title: "Graphic T-Shirt",
      description: "Retro band graphic tee, soft cotton, size M.",
      category: "Tops",
      type: "T-Shirt",
      size: "M",
      condition: "Good",
      tags: ["tshirt", "graphic", "retro"],
      pointValue: 30,
      status: "approved",
      availability: "available",
      color: "#111827",
      createdAgoDays: 25,
    },
    {
      ownerId: bobId,
      title: "Slim Fit Chinos",
      description: "Khaki slim fit chinos, great condition, versatile for work or casual.",
      category: "Bottoms",
      type: "Chinos",
      size: "L",
      condition: "Good",
      tags: ["chinos", "pants", "khaki"],
      pointValue: 50,
      status: "approved",
      availability: "available",
      color: "#a16207",
      createdAgoDays: 22,
    },
    {
      ownerId: bobId,
      title: "Leather Belt",
      description: "Genuine leather belt, brown, adjustable buckle.",
      category: "Accessories",
      type: "Belt",
      size: "L",
      condition: "Good",
      tags: ["belt", "leather"],
      pointValue: 20,
      status: "approved",
      availability: "reserved",
      color: "#78350f",
      createdAgoDays: 12,
    },
    {
      ownerId: bobId,
      title: "Running Shorts",
      description: "Breathable running shorts, lightly used, size L.",
      category: "Activewear",
      type: "Shorts",
      size: "L",
      condition: "Good",
      tags: ["running", "shorts", "activewear"],
      pointValue: 25,
      status: "approved",
      availability: "available",
      color: "#059669",
      createdAgoDays: 10,
    },
    {
      ownerId: claraId,
      title: "Knit Sweater",
      description: "Warm knit sweater in cream color, perfect for winter.",
      category: "Tops",
      type: "Sweater",
      size: "S",
      condition: "Like new",
      tags: ["sweater", "knit", "winter"],
      pointValue: 55,
      status: "approved",
      availability: "available",
      color: "#d97706",
      createdAgoDays: 28,
    },
    {
      ownerId: claraId,
      title: "High-Waisted Jeans",
      description: "Trendy high-waisted jeans, dark wash, true to size.",
      category: "Bottoms",
      type: "Jeans",
      size: "M",
      condition: "Good",
      tags: ["jeans", "denim", "highwaist"],
      pointValue: 55,
      status: "approved",
      availability: "available",
      color: "#1e3a8a",
      createdAgoDays: 14,
    },
    {
      ownerId: claraId,
      title: "Puffer Vest",
      description: "Lightweight puffer vest, navy blue, great for transitional weather.",
      category: "Outerwear",
      type: "Vest",
      size: "M",
      condition: "Like new",
      tags: ["puffer", "vest", "outerwear"],
      pointValue: 65,
      status: "approved",
      availability: "available",
      color: "#1d4ed8",
      createdAgoDays: 8,
    },
    {
      ownerId: claraId,
      title: "Canvas Tote Bag",
      description: "Sturdy canvas tote bag, natural color, great for groceries or books.",
      category: "Accessories",
      type: "Bag",
      size: "M",
      condition: "New with tags",
      tags: ["tote", "bag", "canvas"],
      pointValue: 20,
      status: "approved",
      availability: "available",
      color: "#92400e",
      createdAgoDays: 5,
    },
    {
      ownerId: bobId,
      title: "Outdated Hoodie (spam test)",
      description: "This listing was rejected during moderation for demo purposes.",
      category: "Tops",
      type: "Hoodie",
      size: "L",
      condition: "Fair",
      tags: ["hoodie"],
      pointValue: 15,
      status: "rejected",
      availability: "available",
      color: "#4b5563",
      createdAgoDays: 30,
    },
  ];

  const items: Item[] = [];
  for (const def of itemDefs) {
    const slug = def.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const image = await saveSeedImage(slug, def.title, def.color);
    items.push({
      id: uuidv4(),
      ownerId: def.ownerId,
      title: def.title,
      description: def.description,
      category: def.category,
      type: def.type,
      size: def.size,
      condition: def.condition,
      tags: def.tags,
      images: [image],
      pointValue: def.pointValue,
      status: def.status,
      availability: def.availability,
      createdAt: daysAgo(def.createdAgoDays),
    });
  }

  const byTitle = (title: string) => {
    const item = items.find((i) => i.title === title);
    if (!item) throw new Error(`Seed item not found: ${title}`);
    return item;
  };

  // ------------------------------------------------------------------
  // Swaps in different states
  // ------------------------------------------------------------------
  const swaps: Swap[] = [];

  // 1) Pending points request: Bob requests Alice's Denim Jacket via points.
  //    Points already held (deducted) from Bob.
  const denimJacket = byTitle("Denim Jacket");
  const pendingPointsSwapId = uuidv4();
  swaps.push({
    id: pendingPointsSwapId,
    itemId: denimJacket.id,
    ownerId: denimJacket.ownerId,
    requesterId: bobId,
    kind: "points",
    offeredItemId: null,
    pointsHeld: denimJacket.pointValue,
    status: "pending",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  });
  const bobUser = users.find((u) => u.id === bobId)!;
  bobUser.points -= denimJacket.pointValue; // hold points

  // 2) Pending direct swap request: Clara offers her "Canvas Tote Bag" for
  //    Alice's "White Sneakers".
  const sneakers = byTitle("White Sneakers");
  const toteBag = byTitle("Canvas Tote Bag");
  swaps.push({
    id: uuidv4(),
    itemId: sneakers.id,
    ownerId: sneakers.ownerId,
    requesterId: claraId,
    kind: "swap",
    offeredItemId: toteBag.id,
    pointsHeld: 0,
    status: "pending",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  });

  // 3) Completed points swap (historical): Clara previously redeemed Bob's
  //    "Leather Belt" via points. Belt is now "reserved" per its item def
  //    (kept reserved intentionally to showcase that availability state in
  //    the demo UI) — swap itself is recorded as completed for history.
  const belt = byTitle("Leather Belt");
  swaps.push({
    id: uuidv4(),
    itemId: belt.id,
    ownerId: belt.ownerId,
    requesterId: claraId,
    kind: "points",
    offeredItemId: null,
    pointsHeld: belt.pointValue,
    status: "completed",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(8),
  });
  // Reflect the historical points transfer: Clara paid, Bob received.
  const claraUser = users.find((u) => u.id === claraId)!;
  claraUser.points -= belt.pointValue;
  bobUser.points += belt.pointValue;

  // 4) Rejected request (historical): Bob asked for Clara's "Knit Sweater"
  //    via points, Clara rejected it — points already refunded to Bob.
  const sweater = byTitle("Knit Sweater");
  swaps.push({
    id: uuidv4(),
    itemId: sweater.id,
    ownerId: sweater.ownerId,
    requesterId: bobId,
    kind: "points",
    offeredItemId: null,
    pointsHeld: 0,
    status: "rejected",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
  });

  // 5) Cancelled request (historical): Alice requested Clara's "Puffer Vest"
  //    via a direct swap offer, then cancelled it herself.
  const puffer = byTitle("Puffer Vest");
  // Alice must offer one of her OWN items — use her "Floral Summer Dress".
  const floralDress = byTitle("Floral Summer Dress");
  swaps.push({
    id: uuidv4(),
    itemId: puffer.id,
    ownerId: puffer.ownerId,
    requesterId: aliceId,
    kind: "swap",
    offeredItemId: floralDress.id,
    pointsHeld: 0,
    status: "cancelled",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
  });

  await writeJson("users", users);
  await writeJson("items", items);
  await writeJson("swaps", swaps);

  console.log("\nSeed complete!\n");
  console.log("Demo credentials:");
  console.log(`  Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}  (login at /admin/login)`);
  console.log("  User 1:  alice@demo.com / password123");
  console.log("  User 2:  bob@demo.com / password123");
  console.log("  User 3:  clara@demo.com / password123");
  console.log(`\nCreated ${users.length} users, ${items.length} items, ${swaps.length} swaps.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
