import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Node, mergeAttributes } from "@tiptap/core";

// ── WikilinkNode ──────────────────────────────────────────────────────────────

export const WikilinkNode = Node.create({
  name: "wikilink",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      target: { default: "" },
      alias: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-wikilink]",
        getAttrs: (el) => ({
          target: (el as HTMLElement).getAttribute("data-wikilink") ?? "",
          alias: (el as HTMLElement).getAttribute("data-alias") ?? null,
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "span",
      mergeAttributes({
        "data-wikilink": node.attrs.target,
        "data-alias": node.attrs.alias,
        class: "spaced-wikilink",
      }),
      node.attrs.alias ? `[[${node.attrs.target}|${node.attrs.alias}]]` : `[[${node.attrs.target}]]`,
    ];
  },
});

// ── TagNode ───────────────────────────────────────────────────────────────────

export const TagNode = Node.create({
  name: "tag",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      value: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[data-tag]",
        getAttrs: (el) => ({
          value: (el as HTMLElement).getAttribute("data-tag") ?? "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "span",
      mergeAttributes({
        "data-tag": node.attrs.value,
        class: "spaced-tag",
      }),
      `#${node.attrs.value}`,
    ];
  },
});

// ── Pre-process: markdown → HTML that Tiptap can parse ────────────────────────

export function preprocessMarkdown(markdown: string): string {
  let html = markdown;
  html = html.replace(/\n{3,}/g, "\n\n");

  // ── Step 1: extract fenced code blocks before any other processing ──
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)[ \t]*\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `\x00CODEBLOCK${codeBlocks.length}\x00`;
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    codeBlocks.push(`<pre><code${lang ? ` class="language-${lang}"` : ""}>${escaped}</code></pre>`);
    return placeholder;
  });

  // ── Step 2: extract inline code before bold/italic processing ──
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `\x00INLINECODE${inlineCodes.length}\x00`;
    const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    inlineCodes.push(`<code>${escaped}</code>`);
    return placeholder;
  });

  // ── Step 3: wikilinks, tags, bold, italic, headings, lists ──
  html = html.replace(
    /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
    (_, target, alias) =>
      `<span data-wikilink="${target}" data-alias="${alias}" class="spaced-wikilink">[[${target}|${alias}]]</span>`,
  );
  html = html.replace(
    /\[\[([^\]]+)\]\]/g,
    (_, target) => `<span data-wikilink="${target}" class="spaced-wikilink">[[${target}]]</span>`,
  );
  html = html.replace(
    /(^|[\s])#([\w/-]+)/g,
    (_, before, tag) => `${before}<span data-tag="${tag}" class="spaced-tag">#${tag}</span>`,
  );
  html = html
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m.replace(/\n/g, "")}</ul>`)
    .replace(/<\/ul>\n(?!\n)/g, "</ul>\n\n")
    .replace(/(?<!\n)\n<ul>/g, "\n\n<ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // ── Step 4: restore placeholders ──
  inlineCodes.forEach((code, i) => {
    html = html.replace(`\x00INLINECODE${i}\x00`, code);
  });
  codeBlocks.forEach((block, i) => {
    html = html.replace(`\x00CODEBLOCK${i}\x00`, `</p>${block}<p>`);
  });

  let result = `<p>${html}</p>`;
  result = result.replace(/<\/p><p><ul>/g, "</p><ul>");
  result = result.replace(/<\/ul><\/p><p>/g, "</ul><p>");
  result = result.replace(/<p><ul>/g, "<ul>");
  result = result.replace(/<\/ul><\/p>/g, "</ul>");
  return result;
}

// ── Post-process: extract markdown back from Tiptap HTML ──────────────────────

export function extractMarkdown(editor: Editor): string {
  const html = editor.getHTML();
  let md = html;

  // Wikilinks
  md = md.replace(/<span[^>]*data-wikilink="([^"]*)"[^>]*data-alias="([^"]*)"[^>]*>.*?<\/span>/g, "[[$1|$2]]");
  md = md.replace(/<span[^>]*data-wikilink="([^"]*)"[^>]*>.*?<\/span>/g, "[[$1]]");

  // Tags
  md = md.replace(/<span[^>]*data-tag="([^"]*)"[^>]*>.*?<\/span>/g, "#$1");

  // Code blocks (must come before inline code and generic tag stripping)
  md = md.replace(/<pre><code(?:\s+class="language-(\w+)")?>([\s\S]*?)<\/code><\/pre>/g, (_, lang, code) => {
    const decoded = code.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return `\`\`\`${lang ?? ""}\n${decoded}\`\`\``;
  });

  // Inline code
  md = md.replace(/<code>(.*?)<\/code>/g, (_, code) => {
    const decoded = code.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return `\`${decoded}\``;
  });

  // Standard HTML → markdown
  md = md
    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
    .replace(/<em>(.*?)<\/em>/g, "*$1*")
    .replace(/<h1>(.*?)<\/h1>/g, "# $1")
    .replace(/<h2>(.*?)<\/h2>/g, "## $1")
    .replace(/<h3>(.*?)<\/h3>/g, "### $1")
    .replace(/<li>(.*?)<\/li>/g, "- $1")
    .replace(/<ul>(.*?)<\/ul>/gs, "$1")
    .replace(/<\/p><p>/g, "\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<p>(.*?)<\/p>/gs, "$1")
    .replace(/<[^>]+>/g, ""); // strip any remaining tags

  return md.trim();
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createTiptapEditor(container: HTMLElement, content: string): Editor {
  return new Editor({
    element: container,
    extensions: [StarterKit, WikilinkNode, TagNode],
    content: preprocessMarkdown(content),
    editorProps: {
      attributes: {
        class: "spaced-tiptap-editor",
      },
    },
  });
}
