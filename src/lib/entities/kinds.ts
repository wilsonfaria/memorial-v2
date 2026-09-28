/** Article types the extraction assigns (safe to import from client components). */

export const ARTICLE_KINDS = [
  "noticia", "nascimento", "casamento", "noivado", "obito", "aniversario", "viagem", "visita", "doenca",
  "politica", "religiao", "educacao", "economia", "policia", "esporte", "festa", "anuncio", "edital",
  "cronica", "poesia", "expediente", "outro",
] as const;
export type ArticleKind = (typeof ARTICLE_KINDS)[number];

export const KIND_LABEL: Record<ArticleKind, string> = {
  noticia: "Notícia", nascimento: "Nascimento", casamento: "Casamento", noivado: "Noivado", obito: "Óbito",
  aniversario: "Aniversário", viagem: "Viagem", visita: "Visita", doenca: "Doença", politica: "Política",
  religiao: "Religião", educacao: "Educação", economia: "Economia", policia: "Polícia", esporte: "Esporte",
  festa: "Festa", anuncio: "Anúncio", edital: "Edital", cronica: "Crônica", poesia: "Poesia",
  expediente: "Expediente", outro: "Outro",
};

/**
 * Sensitive kinds (health, police, religion, politics — LGPD art. 11 data):
 * the mentions are kept, but these items never reach the public pages of a
 * person or place — not in the timeline, "aparece junto com", nor the counts.
 * The newspaper itself (PDF, transcription, search) is untouched.
 */
export const PRIVATE_KINDS = ["doenca", "policia", "religiao", "politica"] as const satisfies readonly ArticleKind[];

export const isPrivateKind = (kind: string) => (PRIVATE_KINDS as readonly string[]).includes(kind);

/** Mentions that may appear on a public page (their item isn't of a sensitive kind). */
export const publicMentions = <T extends { article: { kind: string } }>(rows: T[]) =>
  rows.filter((r) => !isPrivateKind(r.article.kind));
