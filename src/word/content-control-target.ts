export interface ContentControlTarget {
  sourceText: string;
  tag: string;
  title: string;
}

export function prepareContentControlTarget(sourceText: string, tag: string, title: string): ContentControlTarget {
  const cleanSource = sourceText.trim();
  const cleanTag = tag.trim().toUpperCase();
  const cleanTitle = title.trim() || cleanTag;
  if (!cleanSource) throw new Error("Văn bản nguồn không được để trống.");
  if (!/^[A-Z0-9_]+$/.test(cleanTag)) throw new Error("Tag Content Control không hợp lệ.");
  return { sourceText: cleanSource, tag: cleanTag, title: cleanTitle };
}
