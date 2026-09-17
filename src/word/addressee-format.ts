export function buildAddresseeText(profileId: string, recipients: string[]): string {
  const cleaned = recipients.map((item) => item.trim()).filter(Boolean);
  if (!cleaned.length) cleaned.push('Tên cơ quan / cá nhân nhận văn bản');
  const party = profileId === 'DANG_05_HD_VPTW_2026';
  if (party) {
    return ['Kính gửi:', ...cleaned.map((item) => `${item.replace(/[;,.]+$/g, '')};`)].join('\n');
  }
  if (cleaned.length === 1) return `Kính gửi: ${cleaned[0].replace(/[;,.]+$/g, '')}`;
  return ['Kính gửi:', ...cleaned.map((item, index) => `- ${item.replace(/^[-–—]\s*/, '').replace(/[;,.]+$/g, '')}${index === cleaned.length - 1 ? '.' : ';'}`)].join('\n');
}
