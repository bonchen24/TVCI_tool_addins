import type { KnowledgeCategory, KnowledgeRecord, KnowledgeScope } from "../knowledge/models";
import { removeVietnameseTones } from "../knowledge/search";
import type { TemplateRecord } from "../templates/library";

export interface QuickPromptSuggestion {
  label: string;
  prompt: string;
  category?: string;
}

export interface ContextualPromptOptions {
  userMessage: string;
  activeTab?: string;
  template?: TemplateRecord | null;
  knowledgeRecords?: KnowledgeRecord[];
  selection?: string;
  documentSnippet?: string;
  ruleProfileName?: string;
}

const CATEGORY_PRIORITY: Record<KnowledgeCategory, number> = {
  mandatory: 4,
  guideline: 3,
  experience: 2,
  phrase: 1,
};

/**
 * Generates dynamic quick prompt suggestions based on user's current context
 * (active tab, selected template, validation issues, Word selection).
 */
export function getSuggestedQuickPrompts(context: {
  activeTab: string;
  template?: TemplateRecord | null;
  issueCount?: number;
  selection?: string;
}): QuickPromptSuggestion[] {
  const suggestions: QuickPromptSuggestion[] = [];

  if (context.activeTab === "drafting") {
    if (context.template) {
      suggestions.push({
        label: "⚡ Điền nhanh các trường",
        prompt: `Gợi ý điền nhanh các thông tin cần thiết cho biểu mẫu "${context.template.name}".`,
      });
      suggestions.push({
        label: "✍️ Soạn phần Căn cứ & Lý do",
        prompt: `Dự thảo phần căn cứ pháp lý và lý do ban hành cho "${context.template.name}" theo chuẩn Vinacomin.`,
      });
      suggestions.push({
        label: "🔍 Rà soát thông tin còn thiếu",
        prompt: `Kiểm tra xem biểu mẫu "${context.template.name}" còn thiếu những dữ liệu nghiệp vụ quan trọng nào.`,
      });
    } else {
      suggestions.push({
        label: "📋 Gợi ý mẫu văn bản phù hợp",
        prompt: "Dựa trên nội dung công việc, gợi ý biểu mẫu văn bản hành chính phù hợp nhất của TVCI.",
      });
      suggestions.push({
        label: "✍️ Dự thảo văn bản hành chính",
        prompt: "Soạn thảo một văn bản hành chính chuẩn theo Nghị định 30/2020/NĐ-CP.",
      });
    }
  } else if (context.activeTab === "inspect") {
    if (context.issueCount && context.issueCount > 0) {
      suggestions.push({
        label: "🔍 Giải thích lỗi phát hiện",
        prompt: "Giải thích chi tiết các lỗi thể thức văn bản vừa được phát hiện và hướng xử lý theo Nghị định 30.",
      });
      suggestions.push({
        label: "🛠️ Hướng dẫn sửa đúng chuẩn",
        prompt: "Hướng dẫn từng bước sửa lại các thành phần thể thức chưa đạt chuẩn trong tài liệu.",
      });
    } else {
      suggestions.push({
        label: "✅ Đánh giá văn phong & thể thức",
        prompt: "Đánh giá mức độ chuẩn xác của thể thức và văn phong hành chính trong văn bản đang mở.",
      });
    }
    suggestions.push({
      label: "👥 Chuẩn hóa Kính gửi & Nơi nhận",
      prompt: "Kiểm tra và chuẩn hóa cách trình bày khối Kính gửi và Nơi nhận theo quy định.",
    });
  } else if (context.activeTab === "knowledge") {
    suggestions.push({
      label: "💡 Tra cứu quy định TVCI",
      prompt: "Quy định bắt buộc về tiêu đề 2 cấp và cách xưng danh pháp nhân của Trung tâm TVCI là gì?",
    });
    suggestions.push({
      label: "🟢 Mẫu câu hành chính chuẩn",
      prompt: "Gợi ý các mẫu câu mở đầu và kết luận trang trọng cho công văn / thông báo gửi đối tác bên ngoài.",
    });
    suggestions.push({
      label: "🟡 Tạo kinh nghiệm nghiệp vụ",
      prompt: "Gợi ý cách đúc kết quy trình kiểm định thành một mục kinh nghiệm xử lý ngắn gọn.",
    });
  } else {
    suggestions.push({
      label: "📐 Tư vấn bố cục văn bản",
      prompt: "Tư vấn cách căn lề, khoảng cách dòng và kích thước bảng biểu theo quy chuẩn A4.",
    });
    suggestions.push({
      label: "🏷️ Đặt trường Content Control",
      prompt: "Hướng dẫn quy tắc đặt mã tag cho trường động Content Control trong biểu mẫu mới.",
    });
  }

  if (context.selection && context.selection.trim().length > 0) {
    suggestions.unshift({
      label: "✂️ Biên tập đoạn chọn",
      prompt: "Biên tập lại đoạn văn bản đang chọn trong Word cho trang trọng, súc tích và đúng quy chuẩn.",
    });
  }

  return suggestions;
}

/**
 * Searches for relevant knowledge records to inject into AI context (RAG-lite).
 */
export function findRelevantKnowledge(
  query: string,
  options: {
    knowledgeRecords?: KnowledgeRecord[];
    scope?: KnowledgeScope;
    maxResults?: number;
  }
): KnowledgeRecord[] {
  const records = options.knowledgeRecords || [];
  const max = options.maxResults ?? 3;
  if (!records.length || !query.trim()) return [];

  const cleanQuery = removeVietnameseTones(query.toLowerCase());
  const queryTokens = cleanQuery.split(/\s+/).filter((t) => t.length > 1);

  const scored = records.map((record) => {
    let score = 0;
    const titleNorm = removeVietnameseTones(record.title.toLowerCase());
    const contentNorm = removeVietnameseTones(record.content.toLowerCase());
    const tagsNorm = record.tags.map((t) => removeVietnameseTones(t.toLowerCase())).join(" ");

    for (const token of queryTokens) {
      if (titleNorm.includes(token)) score += 5;
      if (tagsNorm.includes(token)) score += 4;
      if (contentNorm.includes(token)) score += 2;
    }

    if (options.scope && (record.scope === options.scope || record.scope === "COMMON")) {
      score += 1;
    }

    // Tie-breaker by category priority
    const categoryWeight = CATEGORY_PRIORITY[record.category] || 0;
    return { record, score, categoryWeight };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.categoryWeight - a.categoryWeight)
    .slice(0, max)
    .map((item) => item.record);
}

/**
 * Builds an augmented prompt containing:
 * - User task / question
 * - Template metadata
 * - Internal knowledge rules & guidelines
 * - Selected Word text
 */
export function buildAugmentedAiPrompt(options: ContextualPromptOptions): string {
  const parts: string[] = [];

  parts.push("=== YÊU CẦU NGƯỜI DÙNG ===");
  parts.push(options.userMessage);
  parts.push("");

  if (options.template) {
    parts.push("=== THÔNG TIN BIỂU MẪU ĐANG SOẠN THẢO ===");
    parts.push(`- Tên biểu mẫu: ${options.template.name}`);
    parts.push(`- Đơn vị: ${options.template.organization} (${options.template.department})`);
    parts.push(`- Loại văn bản: ${options.template.documentType}`);
    if (options.template.symbolHint) {
      parts.push(`- Gợi ý số ký hiệu: ${options.template.symbolHint}`);
    }
    parts.push("");
  }

  const queryToSearch = `${options.userMessage} ${options.template?.name || ""} ${options.selection || ""}`;
  const relevantKnowledge = findRelevantKnowledge(queryToSearch, {
    knowledgeRecords: options.knowledgeRecords,
    scope: (options.template?.organization as KnowledgeScope) || undefined,
    maxResults: 3,
  });

  if (relevantKnowledge.length > 0) {
    parts.push("=== QUY ĐỊNH VÀ KIẾN THỨC NGHIỆP VỤ LIÊN QUAN (BẮT BUỘC TUÂN THỦ) ===");
    for (const k of relevantKnowledge) {
      parts.push(`[${k.category.toUpperCase()}] ${k.title}${k.referenceSource ? ` (Nguồn: ${k.referenceSource})` : ""}:`);
      parts.push(`> ${k.content}`);
      if (k.exampleSnippet) {
        parts.push(`> Mẫu tham khảo: "${k.exampleSnippet}"`);
      }
    }
    parts.push("");
  }

  if (options.selection && options.selection.trim().length > 0) {
    parts.push("=== VĂN BẢN ĐANG CHỌN TRONG WORD ===");
    parts.push(options.selection.trim());
    parts.push("");
  } else if (options.documentSnippet && options.documentSnippet.trim().length > 0) {
    parts.push("=== TRÍCH ĐOẠN TÀI LIỆU HIỆN TẠI ===");
    parts.push(options.documentSnippet.trim());
    parts.push("");
  }

  parts.push("=== CHỈ DẪN SOẠN THẢO ===");
  parts.push("- Trả lời chuẩn xác, văn phong hành chính nhà nước trang trọng theo Nghị định 30/2020/NĐ-CP.");
  parts.push("- Tuyệt đối tuân thủ các quy tắc bắt buộc về xưng danh và tiêu đề cấp Viện/Trung tâm nếu có.");
  parts.push("- Cung cấp câu trả lời có thể áp dụng trực tiếp vào tài liệu Word.");

  return parts.join("\n");
}
