import type { DriveCategory } from './folders';
import type { ResourceEntry } from './resources';

const CATEGORY_LABELS: Record<DriveCategory, string> = {
  documents: 'Documents',
  templates: 'Templates',
  knowledge: 'Knowledge',
  references: 'References',
  appData: 'AppData',
};

/** Formats only resources whose identifiers the user explicitly selected. */
export function buildSelectedAiContext(resources: ResourceEntry[], selectedFileIds: string[]): string {
  const selected = new Set(selectedFileIds);
  return resources.filter((resource) => selected.has(resource.fileId)).map((resource) =>
    `[${CATEGORY_LABELS[resource.category]}: ${resource.title}]\n${typeof resource.content === 'string' ? resource.content : JSON.stringify(resource.content)}`
  ).join('\n\n');
}
