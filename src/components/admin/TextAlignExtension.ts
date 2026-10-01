import { Extension } from "@tiptap/core";

export type TextAlignment = "left" | "center" | "right" | "justify";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textAlign: {
      setTextAlign: (alignment: TextAlignment) => ReturnType;
      unsetTextAlign: () => ReturnType;
    };
  }
}

const ALIGNMENTS: TextAlignment[] = ["left", "center", "right", "justify"];
const TYPES = ["heading", "paragraph"];

/**
 * Small local equivalent of Tiptap's TextAlign extension. It serializes a
 * constrained data attribute instead of arbitrary inline CSS, so saved CMS
 * HTML remains safe to pass through the public sanitizer.
 */
export const TextAlignExtension = Extension.create({
  name: "textAlign",

  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          textAlign: {
            default: "left",
            parseHTML: (element) => {
              const value = element.getAttribute("data-text-align") as TextAlignment | null;
              return value && ALIGNMENTS.includes(value) ? value : "left";
            },
            renderHTML: (attributes) => {
              const value = attributes.textAlign as TextAlignment | undefined;
              return value && value !== "left" && ALIGNMENTS.includes(value)
                ? { "data-text-align": value }
                : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextAlign:
        (alignment: TextAlignment) =>
        ({ state, dispatch }) => {
          if (!ALIGNMENTS.includes(alignment)) return false;

          const { from, to, empty, $from } = state.selection;
          let changed = false;

          // Build one transaction so a selection spanning several paragraphs
          // is aligned in a single undo step.
          const tr = state.tr;
          const apply = (node: typeof $from.parent, pos: number) => {
            if (!TYPES.includes(node.type.name) || node.attrs.textAlign === alignment) return;
            changed = true;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: alignment });
          };

          if (empty) {
            apply($from.parent, $from.before($from.depth));
          } else {
            state.doc.nodesBetween(from, to, (node, pos) => apply(node, pos));
          }

          if (changed && dispatch) dispatch(tr);
          return changed;
        },
      unsetTextAlign:
        () =>
        ({ commands }) => commands.setTextAlign("left"),
    };
  },
});
