"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listVersions, restoreVersion, saveHumanEdit, unverifyPage, verifyPage } from "@/lib/ocr-revision/review";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

type Result = { ok: true; message?: string } | { ok: false; error: string };

const done = (editionId: number): void => revalidatePath(`/admin/edicoes/${editionId}`);

export async function saveTranscriptionAction(editionId: number, page: number, text: string): Promise<Result> {
  const session = await requireSession();
  try {
    const r = await saveHumanEdit(Number(editionId), Number(page), String(text), session.username);
    done(editionId);
    return { ok: true, message: r.changed ? "Correção salva e página marcada como conferida." : "Sem mudanças no texto — página marcada como conferida." };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function verifyPageAction(editionId: number, page: number): Promise<Result> {
  const session = await requireSession();
  try {
    await verifyPage(Number(editionId), Number(page), session.username);
    done(editionId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function unverifyPageAction(editionId: number, page: number): Promise<Result> {
  await requireSession();
  await unverifyPage(Number(editionId), Number(page));
  done(editionId);
  return { ok: true };
}

export async function listVersionsAction(editionId: number, page: number) {
  await requireSession();
  return listVersions(Number(editionId), Number(page));
}

export async function restoreVersionAction(versionId: number): Promise<Result> {
  const session = await requireSession();
  try {
    const r = await restoreVersion(Number(versionId), session.username);
    done(r.editionId);
    return { ok: true, message: "Versão restaurada." };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
