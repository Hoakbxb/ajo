import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/join", label: "Join" },
  { href: "/login", label: "Login" },
];

export default function Header() {
  return (
    <header className="border-b border-emerald-900/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
            FRC
          </div>
          <span className="font-semibold text-emerald-950">Friends Reward Circle</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-900/70 transition hover:bg-emerald-50 hover:text-emerald-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
