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
