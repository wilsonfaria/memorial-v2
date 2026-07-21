import Link from "next/link";

type LegalPage = { slug: string; label: string };

export default function Footer({
  newspaperName,
  logoUrl,
  creditsText,
  facebookUrl,
  instagramUrl,
  xUrl,
  legalPages,
}: {
  newspaperName: string;
  logoUrl?: string | null;
  creditsText: string;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  legalPages: LegalPage[];
}) {
  const year = new Date().getFullYear();
  const hasSocial = facebookUrl || instagramUrl || xUrl;

  return (
    <footer className="w-full bg-brand-700">
      <div className="flex flex-wrap items-center justify-center gap-10 border-b border-white/10 px-6 py-6">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={newspaperName} className="h-10 rounded bg-white/95 px-2 object-contain" />
        ) : (
          <span className="text-sm font-medium text-white/80">{newspaperName}</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 px-6 py-4 text-center">
        <p className="text-xs text-white/60">
          © {year} {newspaperName}. {creditsText}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {legalPages.map((p) => (
            <Link
              key={p.slug}
              href={`/${p.slug}`}
              className="text-xs text-white/60 hover:text-white hover:underline"
            >
              {p.label}
            </Link>
          ))}

          {hasSocial && (
            <div className="flex items-center gap-3 text-white/60">
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white">
                  <FacebookIcon />
                </a>
              )}
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white">
                  <InstagramIcon />
                </a>
              )}
              {xUrl && (
                <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="hover:text-white">
                  <XIcon />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.5 8.57L23.3 22H16.9l-5-6.53L6.1 22H3l8-9.14L2.9 2h6.6l4.5 5.96Zm-1.1 18h1.7L7.3 3.9H5.5Z" />
    </svg>
  );
}
