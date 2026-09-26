import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { getBannerDailyTotals } from "@/lib/banners";
import { bannerStatus } from "@/lib/banner-status";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import CreatePanel from "@/components/admin/CreatePanel";
import DailyBarChart from "@/components/admin/DailyBarChart";
import SponsorForm from "./SponsorForm";
import SponsorRow from "./SponsorRow";
import BannerSlotsForm from "./BannerSlotsForm";

export const dynamic = "force-dynamic";

const fmt = new Intl.NumberFormat("pt-BR");

export default async function AdminSponsorsPage() {
  const [banners, settings, daily] = await Promise.all([
    prisma.sponsor.findMany({
      where: { deletedAt: null },
      orderBy: [{ pinned: "desc" }, { order: "asc" }, { id: "asc" }],
    }),
    getSiteSettings(),
    getBannerDailyTotals(30),
  ]);

  const live = banners.filter((b) => bannerStatus(b) === "active");
  const livePinned = live.filter((b) => b.pinned).length;
  const total30 = daily.reduce(
    (acc, d) => ({ appearances: acc.appearances + d.appearances, views: acc.views + d.views, clicks: acc.clicks + d.clicks }),
    { appearances: 0, views: 0, clicks: 0 }
  );

  return (
    <>
      <PageHeader
        title="Banners de patrocinadores"
        description="Os banners aparecem na faixa acima do rodapé, em todas as páginas do site. A cada página visitada, os fixados entram sempre e os demais são sorteados até completar a quantidade por página."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Exibição" description="Quantos banners a faixa mostra em cada página visitada.">
          <BannerSlotsForm bannerSlots={settings.bannerSlots} />
          <p className="mt-3 text-xs text-slate-500">
            No ar agora: <strong>{live.length}</strong> banner(s), {livePinned} fixado(s).
            {livePinned > settings.bannerSlots && " Há mais fixados que vagas — todos os fixados aparecem mesmo assim."}
            {live.length > settings.bannerSlots && livePinned < settings.bannerSlots &&
              ` ${live.length - livePinned} disputam ${settings.bannerSlots - livePinned} vaga(s) no sorteio.`}
          </p>
        </Card>

        <Card
          title="Aparições · 30 dias"
          description={
            <>
              Vezes que um banner entrou na faixa de uma página: <strong>{fmt.format(total30.appearances)}</strong>
            </>
          }
          className="lg:col-span-2"
        >
          <DailyBarChart data={daily.map((d) => ({ date: d.date, count: d.appearances }))} />
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Exibições · 30 dias"
          description={
            <>
              Vezes em que a faixa ficou de fato visível na tela: <strong>{fmt.format(total30.views)}</strong>
            </>
          }
        >
          <DailyBarChart data={daily.map((d) => ({ date: d.date, count: d.views }))} color="var(--color-accent-500)" trackColor="var(--color-accent-100)" />
        </Card>
        <Card
          title="Cliques · 30 dias"
          description={
            <>
              Cliques nos banners: <strong>{fmt.format(total30.clicks)}</strong>
              {total30.views > 0 &&
                ` (${((total30.clicks / total30.views) * 100).toFixed(1).replace(".", ",")}% das exibições)`}
            </>
          }
        >
          <DailyBarChart data={daily.map((d) => ({ date: d.date, count: d.clicks }))} color="var(--color-secondary-600)" trackColor="var(--color-secondary-100)" />
        </Card>
      </div>

      <CreatePanel label="Novo banner" title="Novo banner">
        <SponsorForm />
      </CreatePanel>

      <div className="flex flex-col gap-2">
        {banners.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhum banner cadastrado ainda.</p>
        )}
        {banners.map((b) => (
          <SponsorRow key={b.id} banner={b} />
        ))}
      </div>
    </>
  );
}
