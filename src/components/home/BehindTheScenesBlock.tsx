import Link from "next/link";
import { parseBehindSteps } from "@/lib/behind-steps";

const STEP_CLASS =
  "inline-flex items-center rounded-full border border-accent-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-accent-700 transition-colors";

export default function BehindTheScenesBlock({
  title,
  subtext,
  photo1Url,
  photo2Url,
  photo3Url,
  labels,
  buttonLabel,
  buttonHref,
}: {
  title: string;
  subtext: string | null;
  photo1Url: string | null;
  photo2Url: string | null;
  photo3Url: string | null;
  labels: string;
  buttonLabel: string;
  buttonHref: string;
}) {
  const steps = parseBehindSteps(labels);
  const photos = [photo1Url, photo2Url, photo3Url].filter((p): p is string => Boolean(p));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-paper-200 bg-white p-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-brand-900">{title}</h2>
        {subtext && <p className="mt-1 text-sm text-slate-500">{subtext}</p>}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      )}

      {steps.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {steps.map((step) => (
            <li key={step.label}>
              {step.href ? (
                <Link href={step.href} className={`${STEP_CLASS} hover:border-accent-500 hover:bg-accent-50`}>
                  {step.label}
                </Link>
              ) : (
                <span className={STEP_CLASS}>{step.label}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link
        href={buttonHref}
        className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg bg-brand-900 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-brand-800"
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
