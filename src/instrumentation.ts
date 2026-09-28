/** Runs once when the Next.js server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Background AI transcription; idles until switched on in Admin → Edições.
    const { startAiWorker } = await import("@/lib/ocr-revision/worker");
    startAiWorker();
  }
}
