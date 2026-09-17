export type ProofreadingCategory = "spelling" | "grammar" | "capitalization" | "punctuation" | "administrative_style";

export interface ProofreadingIssue {
  category: ProofreadingCategory;
  original: string;
  suggestion: string;
  explanation: string;
  position?: number;
  context?: string;
}

export interface ProofreadingResult {
  revisedText: string;
  issues: ProofreadingIssue[];
}

const CATEGORIES = new Set<ProofreadingCategory>(["spelling", "grammar", "capitalization", "punctuation", "administrative_style"]);

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI không trả về JSON proofreading hợp lệ.");
  return candidate.slice(start, end + 1);
}

export function buildProofreadingPrompt(text: string): string {
  if (!text.trim()) throw new Error("Chưa có nội dung để kiểm tra.");
  return [
    "Bạn là bộ kiểm tra tiếng Việt cho văn bản VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN / TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP.",
    "Kiểm tra và phân loại lỗi vào đúng 5 nhóm: spelling, grammar, capitalization, punctuation, administrative_style.",
    "Không thay đổi số hiệu, mã hồ sơ, tên riêng, model, tiêu chuẩn, ký hiệu kỹ thuật hoặc số liệu nếu bản gốc không sai rõ ràng.",
    "Trả về DUY NHẤT JSON: {\"revisedText\":\"bản đã hiệu chỉnh\",\"issues\":[{\"category\":\"spelling\",\"original\":\"...\",\"suggestion\":\"...\",\"explanation\":\"...\",\"position\":0,\"context\":\"...\"}]}. position/context là tùy chọn, chỉ thêm khi xác định được.",
    `Văn bản cần kiểm tra:\n${text.trim()}`,
  ].join("\n\n");
}

export function parseProofreadingResult(text: string): ProofreadingResult {
  const parsed = JSON.parse(extractJson(text)) as { revisedText?: unknown; issues?: unknown[] };
  const revisedText = String(parsed.revisedText ?? "").trim();
  if (!revisedText) throw new Error("AI không trả về revisedText.");
  const issues = Array.isArray(parsed.issues) ? parsed.issues.map((item) => {
    const issue = item as Partial<ProofreadingIssue>;
    const rawCategory = String(issue.category ?? "");
    const category = CATEGORIES.has(rawCategory as ProofreadingCategory) ? rawCategory as ProofreadingCategory : "administrative_style";
    const rawPosition = Number(issue.position);
    const position = Number.isInteger(rawPosition) && rawPosition >= 0 ? rawPosition : undefined;
    const context = String(issue.context ?? "").trim() || undefined;
    return {
      category,
      original: String(issue.original ?? ""),
      suggestion: String(issue.suggestion ?? ""),
      explanation: String(issue.explanation ?? ""),
      position,
      context,
    };
  }).filter((issue) => issue.original.trim().length > 0 && issue.original !== issue.suggestion) : [];
  return { revisedText, issues };
}
