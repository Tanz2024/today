type MdxNode = {
  type?: string;
  children?: MdxNode[];
  value?: string;
};

function isWhitespaceText(node: MdxNode) {
  return node.type === "text" && !node.value?.trim();
}

function isImageOnlyParagraph(node: MdxNode) {
  if (node.type !== "paragraph" || !node.children?.length) return false;

  const meaningfulChildren = node.children.filter((child) => !isWhitespaceText(child));
  return meaningfulChildren.length > 0 && meaningfulChildren.every((child) => child.type === "image");
}

function unwrapBlocks(node: MdxNode): MdxNode {
  if (!node.children) return node;

  const children: MdxNode[] = [];
  for (const child of node.children) {
    if (isImageOnlyParagraph(child)) {
      children.push(...(child.children ?? []).filter((nested) => !isWhitespaceText(nested)));
    } else {
      children.push(unwrapBlocks(child));
    }
  }

  return { ...node, children };
}

/**
 * Lets authors use ordinary Markdown image syntax without creating invalid
 * <p><figure>...</figure></p> HTML around the image component.
 */
export function unwrapImageParagraphs() {
  return (tree: MdxNode) => unwrapBlocks(tree);
}
