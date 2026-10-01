import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error -- jsdom is available through isomorphic-dompurify, but its
// transitive package does not ship declarations in this project.
import { JSDOM } from "jsdom";

test("alinhamento é serializado e preservado pelo sanitizador público", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });

  const [{ Editor }, { default: StarterKit }, { TextAlignExtension }, { sanitizePageHtml }] = await Promise.all([
    import("@tiptap/core"),
    import("@tiptap/starter-kit"),
    import("../TextAlignExtension"),
    import("@/lib/sanitize-html"),
  ]);

  const editor = new Editor({
    extensions: [StarterKit, TextAlignExtension],
    content: "<p>Memória viva</p>",
  });

  editor.commands.setTextSelection(2);
  assert.equal(editor.commands.setTextAlign("center"), true);
  assert.match(editor.getHTML(), /data-text-align="center"/);

  const sanitized = sanitizePageHtml(editor.getHTML());
  assert.match(sanitized, /data-text-align="center"/);
  assert.doesNotMatch(sanitized, /style=/);

  assert.equal(editor.commands.setTextAlign("left"), true);
  assert.doesNotMatch(editor.getHTML(), /data-text-align/);
  editor.destroy();
  dom.window.close();
});

test("sanitizador continua removendo estilos arbitrários", async () => {
  const { sanitizePageHtml } = await import("@/lib/sanitize-html");
  const sanitized = sanitizePageHtml('<p data-text-align="invalid" style="position:fixed">Texto</p>');
  assert.doesNotMatch(sanitized, /style=/);
});
