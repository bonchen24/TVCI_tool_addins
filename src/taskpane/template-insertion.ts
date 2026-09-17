export async function runTemplateInsertion(insertTemplate: () => Promise<void>): Promise<void> {
  // PageSetup can make Word resolve the default printer. Template insertion
  // must stay independent from that host-side operation.
  await insertTemplate();
}
