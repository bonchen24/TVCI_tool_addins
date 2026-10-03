import type { SpellcheckIssue } from './types';

export async function runSpellcheckPreflight(
  actionLabel: string,
  scan: () => Promise<SpellcheckIssue[]>,
  confirm: (message: string) => boolean,
  getError: () => string | null = () => null
): Promise<boolean> {
  let issues: SpellcheckIssue[];
  try {
    issues = await scan();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không xác định được lỗi.';
    return confirm(`Không thể hoàn tất kiểm tra chính tả (${message}). Bạn vẫn muốn ${actionLabel}?`);
  }

  const error = getError();
  if (error) {
    return confirm(`Không thể hoàn tất kiểm tra chính tả (${error}). Bạn vẫn muốn ${actionLabel}?`);
  }

  return confirmSpellcheckFindings(actionLabel, issues, confirm);
}

export function confirmSpellcheckFindings(
  actionLabel: string,
  issues: SpellcheckIssue[],
  confirm: (message: string) => boolean
): boolean {
  const spellingCount = issues.filter((issue) => issue.category === 'spelling').length;
  if (!spellingCount) return true;
  return confirm(`Phát hiện ${spellingCount} mục nghi ngờ chính tả. Văn bản chưa được tự sửa. Bạn vẫn muốn ${actionLabel}?`);
}
