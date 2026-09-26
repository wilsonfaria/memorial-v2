import Link from "next/link";
import { QuillIcon } from "@/components/icons";
import SocialLinks from "@/components/SocialLinks";
import AccessibilityBar from "@/components/AccessibilityBar";
import type { PublicMenuItem } from "@/lib/menu-repo";

export default function Footer({
  newspaperName,
  logoUrl,
  tagline,
  facebookUrl,
  instagramUrl,
  xUrl,
  youtubeUrl,
  menuItems,
  creditsText,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  tagline: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  youtubeUrl?: string | null;
  menuItems: PublicMenuItem[];
  creditsText?: string;
}) {
  return (
    <footer className="w-full bg-brand-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={newspaperName} className="h-16 w-auto rounded bg-white/95 px-3 py-2 object-contain" />
          ) : (
            <>
              <QuillIcon className="h-9 w-9 shrink-0 text-white/90" />
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Memorial do Jornal</p>
                <p className="font-display text-lg font-bold text-white">{newspaperName}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/50">{tagline}</p>
              </div>
            </>
          )}
        </div>

        <p className="font-display max-w-md text-center text-sm italic text-white/70">
          &ldquo;A memória de um povo é o alicerce do seu futuro.&rdquo;
        </p>

        <SocialLinks
          facebookUrl={facebookUrl}
          instagramUrl={instagramUrl}
          xUrl={xUrl}
          youtubeUrl={youtubeUrl}
          className="text-white/60"
        />
      </div>

      {menuItems.length > 0 && (
        <div className="border-t border-white/10 px-6 py-3">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 text-[11px] text-white/60 lg:justify-end">
            {menuItems.map((item, i) => (
              <span key={item.id} className="flex flex-wrap items-center gap-3">
                {i > 0 && <span className="text-white/30">|</span>}
                <FooterMenuLink item={item} />
                {item.children.map((child) => (
                  <FooterMenuLink key={child.id} item={child} muted />
                ))}
              </span>
            ))}
          </nav>
        </div>
      )}

      <div className="border-t border-white/10 px-6 py-3">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 lg:flex-row lg:justify-between">
          <p className="text-center text-[11px] text-white/60 lg:text-left">
            © {new Date().getFullYear()} {newspaperName}. Todos os direitos reservados.
            {creditsText && (
              <>
                <span className="mx-2 text-white/30">|</span>
                <LinkifiedText text={creditsText} />
              </>
            )}
          </p>
          <AccessibilityBar />
        </div>
      </div>
    </footer>
  );
}

// Bare domains or URLs inside the admin-written credits text ("…: willabs.ia.br").
const URL_PATTERN = /((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;

/** Renders the credits text with any domain/URL in it turned into a link. */
function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_PATTERN).map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={/^https?:\/\//i.test(part) ? part : `https://${part}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white/80 hover:text-white hover:underline"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function FooterMenuLink({
  item,
  muted,
}: {
  item: { label: string; url: string; openNewTab: boolean };
  muted?: boolean;
}) {
  return (
    <Link
      href={item.url}
      target={item.openNewTab ? "_blank" : undefined}
      rel={item.openNewTab ? "noopener noreferrer" : undefined}
      className={`hover:text-white hover:underline ${muted ? "text-white/45" : ""}`}
    >
      {item.label}
    </Link>
  );
}
