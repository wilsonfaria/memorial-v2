type Sponsor = { id: number; name: string; logoUrl: string; linkUrl: string | null };

export default function SponsorFooterCarousel({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;

  // With few sponsors, a single set would fit entirely on screen and the loop
  // would just look static. Repeat the set a modest number of times so the
  // strip is wide enough to always overflow, then duplicate that set once
  // so the -50% animation loops seamlessly — without piling on so many
  // repeats that a couple of sponsors look like a wall of duplicates.
  const MIN_ITEMS_PER_SET = 6;
  const repeatCount = Math.max(1, Math.ceil(MIN_ITEMS_PER_SET / sponsors.length));
  const singleSet = Array.from({ length: repeatCount }, () => sponsors).flat();
  const track = [...singleSet, ...singleSet];

  return (
    <div className="group mt-8 shrink-0 border-t border-paper-200 bg-white/60 py-4">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes sponsor-marquee {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            .sponsor-marquee-track {
              animation: sponsor-marquee 42.9s linear infinite;
            }
            .group:hover .sponsor-marquee-track {
              animation-play-state: paused;
            }
          `,
        }}
      />
      <div className="mx-auto max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8">
        <div className="flex w-max gap-10 sponsor-marquee-track">
          {track.map((sponsor, i) => (
            <SponsorLogo key={`${sponsor.id}-${i}`} sponsor={sponsor} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SponsorLogo({ sponsor }: { sponsor: Sponsor }) {
  const content = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sponsor.logoUrl}
      alt={sponsor.name}
      className="h-full max-w-[280px] object-contain grayscale transition-all hover:grayscale-0"
    />
  );

  return (
    <div className="flex h-[120px] w-auto shrink-0 items-center justify-center px-6">
      {sponsor.linkUrl ? (
        <a href={sponsor.linkUrl} target="_blank" rel="noopener noreferrer sponsored" className="flex h-full items-center justify-center">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
