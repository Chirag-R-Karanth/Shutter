import { FloatingAddButton } from "@/components/FloatingAddButton";
import { PosterGrid } from "@/components/PosterGrid";
import { getMediaByCategory } from "@/actions/media";
import { MediaType } from "@/types";

type Props = {
  params: Promise<{ category: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { category: rawCategory } = await params;
  const category = rawCategory as MediaType;
  const data = await getMediaByCategory(category);

  return (
    <div className="relative min-h-[80vh]">
      <PosterGrid items={data} />
      <FloatingAddButton category={category} />
    </div>
  );
}
