import Link from "next/link";

const categories = [
  { name: "Movies", path: "/movies" },
  { name: "TV", path: "/tv" },
  { name: "Anime", path: "/anime" },
  { name: "Books", path: "/books" },
  { name: "Games", path: "/games" },
];

export default function Home() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-12 mt-16">
        <h1 className="text-4xl md:text-5xl font-heading text-foreground/90 font-medium tracking-wide">
          Archive
        </h1>
        <div className="flex flex-col md:flex-row gap-6 md:gap-16 items-center">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={cat.path}
              className="group flex flex-col items-center gap-3 transition-opacity duration-300 hover:opacity-100 opacity-60"
            >
              <span className="text-xl md:text-2xl font-heading tracking-wide">
                {cat.name}
              </span>
              <span className="w-1 h-1 rounded-full bg-foreground/0 group-hover:bg-foreground/50 transition-colors duration-300" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
