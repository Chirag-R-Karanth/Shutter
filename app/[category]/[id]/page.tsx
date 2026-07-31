import { getMediaById } from "@/actions/media";
import { MediaDetailClient } from "@/components/MediaDetailClient";

type Props = {
  params: Promise<{ category: string; id: string }>;
};

export default async function DetailPage({ params }: Props) {
  const { id } = await params;
  const item = await getMediaById(id);

  if (!item) {
    return <div className="p-12 text-center text-white/50">Not found</div>;
  }

  return <MediaDetailClient item={item} />;
}
