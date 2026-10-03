/**
 * Administrative Prompt Rules & Security Guards
 * Strictly conforms to Nghị định 30/2020/NĐ-CP & F18 contract.
 */

/** Exactly 4 core rules as defined by Tier 1 Feature 18 specification */
export const ADMINISTRATIVE_AI_RULES: string[] = [
  "TUYỆT ĐỐI KHÔNG BỊA ĐẶT (no hallucination) số hiệu, ngày tháng, thông tin không có trong tài liệu.",
  "KHÔNG DÙNG ĐỊNH DẠNG MARKDOWN (không dùng #, **, *, -, ```).",
  "KHÔNG DÙNG BIỂU TƯỢNG CẢM XÚC (emoji).",
  "NGÔN NGỮ CHUẨN XÁC, TRANG TRỌNG, ĐÚNG THỂ THỨC HÀNH CHÍNH VIỆT NAM (Nghị định 30/2020/NĐ-CP).",
];

export const ADMINISTRATIVE_AI_RULES_STRING: string = ADMINISTRATIVE_AI_RULES.join('\n');

/**
 * Checks for prompt injection or system instruction override attempts.
 * Supports both Vietnamese and English patterns.
 */
export function isInjectionAttempt(input: string): boolean {
  if (!input || typeof input !== 'string') return false;

  const patterns: RegExp[] = [
    // English instruction / rule overrides
    /ignore\s+(?:(?:all|any|the)\s+)?(?:(?:previous|prior|above|system)\s+)?(?:instructions|rules|constraints|prompts?)/iu,
    /disregard\s+(?:(?:all|any|the)\s+)?(?:(?:previous|prior|above)\s+)?(?:instructions|rules|constraints)/iu,
    /forget\s+(?:(?:all|about)\s+)?(?:(?:previous|prior)\s+)?(?:instructions|rules)/iu,
    /(?:override|bypass)\s+(?:(?:all|system|safety|the)\s+)?(?:instructions|rules|prompts?|filters?|constraints?)/iu,

    // Jailbreak & persona overrides
    /\b(?:DAN|do\s+anything\s+now)\b/iu,
    /act\s+as\s+(?:an?\s+)?unrestricted/iu,
    /(?:enter|in)\s+developer\s+mode/iu,
    /\bjailbreak\b/iu,
    /system\s+prompt/iu,
    /print\s+(?:admin\s+|secret\s+|api\s*)?(?:token|key|password|credential)/iu,

    // Vietnamese instruction & rule overrides
    /(?:bỏ\s+qua|hủy\s+bỏ)\s+(?:hết|tất\s+cả|mọi|các|toàn\s+bộ)?\s*(?:quy\s+tắc|chỉ\s+dẫn|hướng\s+dẫn|yêu\s+cầu|ràng\s+buộc)/iu,
    /bỏ\s+qua\s+mọi\s+chỉ\s+dẫn\s+trước/iu,
    /quên\s+(?:hết|tất\s+cả|mọi)?\s*(?:chỉ\s+dẫn|hướng\s+dẫn|quy\s+tắc)/iu,
    /không\s+cần\s+tuân\s+(?:theo|thủ)\s+(?:quy\s+tắc|chỉ\s+dẫn|hướng\s+dẫn)/iu,
    /đóng\s+vai\s+trợ\s+lý\s+không\s+giới\s+hạn/iu,
    /chế\s+độ\s+(?:nhà\s+phát\s+triển|không\s+giới\s+hạn)/iu,
    /tiết\s+lộ\s+(?:mật\s+khẩu|system\s+prompt|chỉ\s+dẫn\s+hệ\s+thống|mã\s+bí\s+mật)/iu,
  ];

  return patterns.some((p) => p.test(input));
}

export function hasInjectionAttempt(...inputs: Array<string | undefined | null>): boolean {
  return inputs.some((input) => typeof input === 'string' && isInjectionAttempt(input));
}

