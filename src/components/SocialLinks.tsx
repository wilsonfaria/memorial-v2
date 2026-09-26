import { InstagramIcon, FacebookIcon, YoutubeIcon, XIcon } from "@/components/icons";

export default function SocialLinks({
  facebookUrl,
  instagramUrl,
  xUrl,
  youtubeUrl,
  className = "",
}: {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
  youtubeUrl?: string | null;
  className?: string;
}) {
  if (!facebookUrl && !instagramUrl && !xUrl && !youtubeUrl) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {instagramUrl && (
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white">
          <InstagramIcon />
        </a>
      )}
      {facebookUrl && (
        <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white">
          <FacebookIcon />
        </a>
      )}
      {youtubeUrl && (
        <a href={youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-white">
          <YoutubeIcon />
        </a>
      )}
      {xUrl && (
        <a href={xUrl} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="hover:text-white">
          <XIcon />
        </a>
      )}
    </div>
  );
}
