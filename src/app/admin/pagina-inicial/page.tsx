import { getHeroSlides, getHomepageContent } from "@/lib/homepage";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import AdminNewLink from "@/components/admin/AdminNewLink";
import HomepageContentForm from "./HomepageContentForm";
import HeroSlideRow from "./HeroSlideRow";

export const dynamic = "force-dynamic";

export default async function AdminHomepagePage() {
  const [content, slides] = await Promise.all([getHomepageContent(), getHeroSlides()]);
  const publishedCount = slides.filter((s) => s.published).length;

  return (
    <>
      <PageHeader
        title="Página Inicial"
        description="Conteúdo editorial da home: carrossel do hero, vídeo “Memória Viva” e o bloco “Por trás do Memorial”. As mudanças refletem no site assim que salvas."
        action={<AdminNewLink href="/admin/pagina-inicial/slides/novo" label="Novo slide" />}
      />

      <Card
        title="Carrossel do hero"
        description={
          <>
            Slides do topo da home, na ordem abaixo. Com mais de um slide publicado, eles passam sozinhos a cada 7
            segundos (pausa ao passar o mouse). {publishedCount} de {slides.length} publicado(s).
          </>
        }
        className="mb-6"
      >
        <div className="flex flex-col gap-1">
          {slides.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              Nenhum slide cadastrado — o hero aparece só com a cor da marca.
            </p>
          )}
          {slides.map((slide, i) => (
            <HeroSlideRow key={slide.id} slide={slide} index={i} total={slides.length} />
          ))}
        </div>
      </Card>

      <Card>
        <HomepageContentForm content={content} />
      </Card>
    </>
  );
}
