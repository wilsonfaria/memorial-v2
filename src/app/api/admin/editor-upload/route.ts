import { writeFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { ensureEditorUploadDir, EDITOR_UPLOAD_DIR, EDITOR_PUBLIC_PREFIX } from "@/lib/editor-storage";
import { MAX_IMAGE_BYTES, formatMaxSize } from "@/lib/upload-limits";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Não autorizado." }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Apenas imagens são aceitas." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: `A imagem deve ter no máximo ${formatMaxSize(MAX_IMAGE_BYTES)}.` }, { status: 400 });
  }

  await ensureEditorUploadDir();
  const ext = (file.type.split("/")[1] || "png").replace("svg+xml", "svg");
  const fileName = `editor-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(EDITOR_UPLOAD_DIR, fileName), bytes);

  return Response.json({ url: `${EDITOR_PUBLIC_PREFIX}/${fileName}` });
}
