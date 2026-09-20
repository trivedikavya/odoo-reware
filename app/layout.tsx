import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCurrentUser, toPublicUserWithRate } from "@/lib/session";

export const metadata: Metadata = {
  title: "ReWear – Community Clothing Exchange",
  description:
    "Swap unused clothing directly or redeem items with points. Promote sustainable fashion and reduce textile waste.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  const publicUser = currentUser ? await toPublicUserWithRate(currentUser) : null;

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Navbar user={publicUser} />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
