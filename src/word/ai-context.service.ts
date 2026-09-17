import { inferDocumentType, type AiDocumentContext } from "../ai/document-context";

export async function readWordAiDocumentContext(activeTemplateName: string, ruleProfileName: string): Promise<AiDocumentContext> {
  return Word.run(async (context) => {
    const body = context.document.body;
    const selection = context.document.getSelection();
    const controls = context.document.contentControls;
    body.load("text");
    selection.load("text");
    controls.load("items/id,items/tag,items/title");
    await context.sync();
    const documentText = body.text.trim();
    return {
      documentText,
      selectionText: selection.text.trim() || undefined,
      controls: controls.items
        .filter((control) => Boolean(control.tag))
        .map((control) => ({ id: control.id, tag: control.tag, title: control.title })),
      activeTemplateName: activeTemplateName.trim() || undefined,
      documentType: inferDocumentType(documentText),
      ruleProfileName,
    };
  });
}
