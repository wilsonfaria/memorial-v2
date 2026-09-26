"use server";

import { getClosestEditionToDate } from "@/lib/data";

export type BirthdayLookupState =
  | { error: string }
  | {
      editionId: number;
      title: string;
      publishedAt: string;
      thumbnailPath: string | null;
      exact: boolean;
      daysDiff: number;
    }
  | undefined;

/** Public, unauthenticated: any visitor can look up the edition closest to a date they type in. */
export async function findEditionByDateAction(
  _prevState: BirthdayLookupState,
  formData: FormData
): Promise<BirthdayLookupState> {
  const raw = String(formData.get("date") ?? "").trim();
  const target = new Date(raw);
  if (!raw || Number.isNaN(target.getTime())) {
    return { error: "Escolha uma data válida." };
  }
  if (target.getFullYear() < 1900 || target.getFullYear() > 2100) {
    return { error: "Escolha uma data dentro de um intervalo razoável." };
  }

  const result = await getClosestEditionToDate(target);
  if (!result) return { error: "Ainda não há edições cadastradas no acervo." };

  return {
    editionId: result.edition.id,
    title: result.edition.title,
    publishedAt: result.edition.publishedAt.toISOString(),
    thumbnailPath: result.edition.thumbnailPath,
    exact: result.daysDiff === 0,
    daysDiff: result.daysDiff,
  };
}
