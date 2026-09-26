import HeroSection from "@/components/home/HeroSection";
import QuickNavCards from "@/components/home/QuickNavCards";
import MemoriaVivaBlock from "@/components/home/MemoriaVivaBlock";
import BehindTheScenesBlock from "@/components/home/BehindTheScenesBlock";
import TimelineSection from "@/components/home/TimelineSection";
import OnThisDaySection from "@/components/home/OnThisDaySection";
import BirthdayFinder from "@/components/home/BirthdayFinder";
import {
  getOnThisDayEditions,
  getNavigationTree,
  getPublishedChronicleTitles,
  getPublishedTimeline,
} from "@/lib/data";
import { getHeroSlides, getHomepageContent } from "@/lib/homepage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [content, heroSlides, onThisDayEditions, tree, chronicles, milestones] = await Promise.all([
    getHomepageContent(),
    getHeroSlides({ publishedOnly: true }),
    getOnThisDayEditions(12),
    getNavigationTree(),
    getPublishedChronicleTitles(),
    getPublishedTimeline(),
  ]);

  return (
    <>
      <HeroSection
        slides={heroSlides.map(({ id, imageUrl, headline, subtext, ctaLabel, ctaHref }) => ({
          id,
          imageUrl,
          headline,
          subtext,
          ctaLabel,
          ctaHref,
        }))}
        heroMockup1Url={content.heroMockup1Url}
        heroMockup2Url={content.heroMockup2Url}
        tree={tree}
        chronicles={chronicles}
      />

      <QuickNavCards
        images={{
          navDecadasImageUrl: content.navDecadasImageUrl,
          navAnosImageUrl: content.navAnosImageUrl,
          navMesesImageUrl: content.navMesesImageUrl,
          navEdicoesImageUrl: content.navEdicoesImageUrl,
          navCronicasImageUrl: content.navCronicasImageUrl,
        }}
      />

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 pb-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <MemoriaVivaBlock
          title={content.videoTitle}
          subtitle={content.videoSubtitle}
          embedUrl={content.videoEmbedUrl}
          thumbnailUrl={content.videoThumbnailUrl}
          buttonLabel={content.videoButtonLabel}
        />
        <BehindTheScenesBlock
          title={content.behindTitle}
          subtext={content.behindSubtext}
          photo1Url={content.behindPhoto1Url}
          photo2Url={content.behindPhoto2Url}
          photo3Url={content.behindPhoto3Url}
          labels={content.behindLabels}
          buttonLabel={content.behindButtonLabel}
          buttonHref={content.behindButtonHref}
        />
      </section>

      <OnThisDaySection editions={onThisDayEditions} />

      <BirthdayFinder />

      <TimelineSection milestones={milestones} />
    </>
  );
}
