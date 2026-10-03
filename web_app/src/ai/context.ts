/** Adds only content explicitly selected by the user for the current request. */
export function combineSelectedContext(existingContext: string | undefined, selectedContext: string | undefined): string | undefined {
  const existing = existingContext?.trim() || '';
  const selected = selectedContext?.trim() || '';
  if (!selected) return existing || undefined;
  const marker = 'Ngữ cảnh cá nhân được người dùng chọn cho yêu cầu AI hiện tại:';
  return [existing, `${marker}\n${selected}`].filter(Boolean).join('\n\n');
}
