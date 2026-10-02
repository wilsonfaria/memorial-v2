import { notFound } from "next/navigation";
import { getHeroSlides } from "@/lib/homepage";
import AdminEditPage from "@/components/admin/AdminEditPage";
import HeroSlideRow from "../../HeroSlideRow";

export const dynamic = "force-dynamic";

export default async function EditHeroSlidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slides = await getHeroSlides();
  const index = slides.findIndex((slide) => slide.id === Number(id));
  if (index < 0) notFound();
  const slide = slides[index];

  return (
    <AdminEditPage title={`Editar slide: ${slide.headline}`} backHref="/admin/pagina-inicial">
      <HeroSlideRow slide={slide} index={index} total={slides.length} editing />
    </AdminEditPage>
  );
}
