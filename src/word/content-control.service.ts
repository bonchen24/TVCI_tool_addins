import { normalizeControlTag } from "../content-controls/field-map";
import { prepareContentControlTarget } from "./content-control-target";
import { MissingContentControlError } from "./word-errors";

export interface TaggedContentControl {
  id: number;
  tag: string;
  title: string;
}

export async function listTaggedContentControls(): Promise<TaggedContentControl[]> {
  return Word.run(async (context) => {
    const controls = context.document.contentControls;
    controls.load("items/id,items/tag,items/title");
    await context.sync();
    return controls.items
      .filter((control) => Boolean(control.tag))
      .map((control) => ({ id: control.id, tag: control.tag, title: control.title }));
  });
}

export async function setContentControlText(tag: string, value: string): Promise<void> {
  const wanted = normalizeControlTag(tag);
  await Word.run(async (context) => {
    const controls = context.document.contentControls;
    controls.load("items/id,items/tag");
    await context.sync();
    const control = controls.items.find((item) => normalizeControlTag(item.tag) === wanted);
    if (!control) throw new MissingContentControlError(wanted);
    control.insertText(value, Word.InsertLocation.replace);
    await context.sync();
  });
}

export async function addContentControlAtSelection(tag: string, title: string): Promise<void> {
  const normalizedTag = normalizeControlTag(tag);
  if (!normalizedTag) throw new Error("Tag trường dữ liệu không được để trống.");
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    const control = range.insertContentControl();
    control.tag = normalizedTag;
    control.title = title.trim() || normalizedTag;
    control.appearance = Word.ContentControlAppearance.hidden;
    await context.sync();
  });
}

export async function addContentControlAroundFirstMatch(sourceText: string, tag: string, title: string): Promise<void> {
  const target = prepareContentControlTarget(sourceText, tag, title);
  await Word.run(async (context) => {
    const results = context.document.body.search(target.sourceText, { matchCase: false, matchWholeWord: false });
    results.load("items");
    await context.sync();
    const range = results.items[0];
    if (!range) throw new Error(`Không tìm thấy chuỗi trong tài liệu: ${target.sourceText}`);
    const control = range.insertContentControl();
    control.tag = target.tag;
    control.title = target.title;
    control.appearance = Word.ContentControlAppearance.hidden;
    await context.sync();
  });
}

export async function setMultipleContentControlTexts(values: Array<{ tag: string; value: string }>): Promise<number> {
  if (!values.length) return 0;
  const wanted = new Map(values.map((item) => [normalizeControlTag(item.tag), item.value]));
  return Word.run(async (context) => {
    const controls = context.document.contentControls;
    controls.load("items/id,items/tag");
    await context.sync();
    let updated = 0;
    for (const control of controls.items) {
      const value = wanted.get(normalizeControlTag(control.tag));
      if (value === undefined) continue;
      control.insertText(value, Word.InsertLocation.replace);
      updated += 1;
    }
    await context.sync();
    return updated;
  });
}
