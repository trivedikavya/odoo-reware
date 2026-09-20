import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="container-page flex flex-col items-center justify-between gap-4 py-8 text-sm text-gray-500 sm:flex-row">
        <p>&copy; {new Date().getFullYear()} ReWear. Swap clothes, save the planet.</p>
        <div className="flex gap-4">
          <Link href="/items" className="hover:text-brand-700">Browse</Link>
          <Link href="/items/new" className="hover:text-brand-700">List an item</Link>
          <Link href="/admin/login" className="hover:text-brand-700">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
