import type { TreeDecade } from "@/lib/data";
import EditionSearchPanel from "./EditionSearchPanel";
import HeroCarousel, { type HeroSlideData } from "./HeroCarousel";

type ChronicleOption = { slug: string; title: string };

export default function HeroSection({
  slides,
  heroMockup1Url,
  heroMockup2Url,
  tree,
  chronicles,
}: {
  slides: HeroSlideData[];
  heroMockup1Url: string | null;
  heroMockup2Url: string | null;
  tree: TreeDecade[];
  chronicles: ChronicleOption[];
}) {
  // One featured cover. HeroCarousel places it in a box 42% of the viewport
  // wide × 92% of the hero tall, flush with the hero's bottom-right corner
  // (bleeding off the screen edge, like the reference art). The image keeps
  // its own aspect ratio and grows until it hits the box's width or height.
  // heroMockup2Url is legacy (there used to be two covers): shown only until
  // the admin form is saved once, which moves it into heroMockup1Url.
  const coverUrl = heroMockup1Url ?? heroMockup2Url;
  const mockups = coverUrl ? (
    <div className="flex h-full w-full items-end justify-end">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={coverUrl} alt="" className="max-h-full max-w-full rounded-tl-md shadow-2xl" />
    </div>
  ) : null;

  return (
    <section className="relative">
      <HeroCarousel slides={slides} aside={mockups} />

      <div className="relative z-10 mx-auto -mt-10 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <EditionSearchPanel tree={tree} chronicles={chronicles} />
      </div>
    </section>
  );
}
