"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Movies", path: "/movies" },
  { name: "TV", path: "/tv" },
  { name: "Anime", path: "/anime" },
  { name: "Books", path: "/books" },
  { name: "Games", path: "/games" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-center gap-8 py-12 px-6">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.path);
        return (
          <Link
            key={item.name}
            href={item.path}
            className={cn(
              "text-lg transition-colors duration-300 hover:text-foreground font-heading",
              isActive ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
