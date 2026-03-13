import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { BilibiliCard } from "~/components/bilibili-card";
import { normalizeBilibiliBvid } from "~/lib/bilibili";

type MarkdownNode = {
  type?: string;
  value?: string;
  children?: MarkdownNode[];
};

function getNodeText(node: MarkdownNode): string {
  if (node.type === "text") {
    return node.value ?? "";
  }

  return node.children?.map(getNodeText).join("") ?? "";
}

function remarkBilibiliEmbed() {
  return (tree: MarkdownNode) => {
    const visit = (node: MarkdownNode) => {
      if (!node.children?.length) return;

      for (let index = 0; index < node.children.length; index += 1) {
        const child = node.children[index];
        if (child.type === "paragraph") {
          const bvid = normalizeBilibiliBvid(getNodeText(child).trim());
          if (bvid) {
            node.children.splice(index, 1, {
              type: "html",
              value: `<bilibili-card bvid="${bvid}"></bilibili-card>`,
            });
            continue;
          }
        }

        visit(child);
      }
    };

    visit(tree);
  };
}

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "bilibili-card"],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    "bilibili-card": ["bvid"],
  },
};

export const markdownRemarkPlugins = [remarkGfm, remarkBilibiliEmbed];
export const markdownRehypePlugins = [rehypeRaw, [rehypeSanitize, sanitizeSchema]];
export const markdownComponents = {
  "bilibili-card": ({ bvid }: { bvid?: string }) => <BilibiliCard bvid={bvid} />,
};
