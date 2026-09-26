export function QuillIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20.5 3.5c-5 0-11 3-14.5 9-1.5 2.6-2.5 5.5-3 8 2.5-.5 5.4-1.5 8-3 6-3.5 9-9.5 9-14Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11 13 4 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9.5 17.5c-1.5.6-3.2 1-4.5 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23 12s0-3.4-.43-5a2.8 2.8 0 0 0-2-2C18.9 4.5 12 4.5 12 4.5s-6.9 0-8.57.5a2.8 2.8 0 0 0-2 2C1 8.6 1 12 1 12s0 3.4.43 5a2.8 2.8 0 0 0 2 2C5.1 19.5 12 19.5 12 19.5s6.9 0 8.57-.5a2.8 2.8 0 0 0 2-2C23 15.4 23 12 23 12ZM9.75 15.5v-7l6 3.5Z" />
    </svg>
  );
}

export function XIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.5 8.57L23.3 22H16.9l-5-6.53L6.1 22H3l8-9.14L2.9 2h6.6l4.5 5.96Zm-1.1 18h1.7L7.3 3.9H5.5Z" />
    </svg>
  );
}
