/**
 * Hermetic Mock AI Provider
 * Provides deterministic responses for automated tests and offline development.
 */

import type {
  DraftingRequest,
  DraftingResult,
  ProofreadingResult,
  ProofreadIssue,
  TemplateFillResult,
  ExtractedFieldItem,
} from './types';
import { getFormSchema } from '../templates/form-schema';

export const MOCK_AI_RESPONSES = {
  drafting: {
    content:
      'Kính gửi: Ban Lãnh đạo Tổng công ty.\nThực hiện chỉ đạo của Hội đồng thành viên, Phòng Kế hoạch xin trân trọng báo cáo phương án sản xuất kinh doanh quý IV năm 2026.',
    tokensUsed: 45,
  },
  proofreading: {
    issues: [
      {
        category: 'spelling' as const,
        original: 'nghiên cứu kiễm tra',
        replacement: 'nghiên cứu kiểm tra',
        suggestion: 'nghiên cứu kiểm tra',
        explanation: "Sai dấu thanh: 'kiễm' sửa thành 'kiểm'",
        position: 23,
        endIndex: 42,
      },
      {
        category: 'administrative_style' as const,
        original: 'chúng tôi xin gửi kèm',
        replacement: 'xin gửi kèm theo',
        suggestion: 'xin gửi kèm theo',
        explanation: "Văn phong hành chính trang trọng nên tránh xưng hô 'chúng tôi'",
        position: 59,
        endIndex: 80,
      },
    ],
  },
};

/**
 * Handles mock drafting requests
 */
export function handleMockDrafting(request: DraftingRequest): DraftingResult {
  const prompt = (request.userPrompt || '').toLowerCase();
  const context = (request.context || '').trim();

  let text = '';
  if (prompt.includes('kiểm toán nội bộ') || prompt.includes('báo cáo tiến độ')) {
    text = `Kính gửi: Ban Lãnh đạo Tổng công ty TVCI.\nThực hiện chỉ đạo, Phòng Kế hoạch xin trân trọng báo cáo tình hình kiểm toán nội bộ và tiến độ triển khai công tác theo đúng kế hoạch. ${context ? `Bối cảnh: ${context}` : ''}`.trim();
  } else if (request.section === 'can_cu') {
    text =
      'Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;\nCăn cứ Quyết định số 15/QĐ-TVCI ngày 10 tháng 01 năm 2026 của Tổng Giám đốc quy định chức năng, nhiệm vụ của các phòng ban.';
  } else if (request.section === 'ket_luan') {
    text =
      'Kính trình Ban Lãnh đạo Tổng công ty xem xét, phê duyệt để đơn vị có cơ sở triển khai thực hiện các bước tiếp theo.';
  } else {
    text = MOCK_AI_RESPONSES.drafting.content;
  }

  const paragraphs = text.split('\n').filter((p) => p.trim().length > 0);

  return {
    content: text,
    paragraphs,
    tokensUsed: 45,
    model: 'mock-administrative-v1',
  };
}

/**
 * Handles mock proofreading requests
 */
export function handleMockProofreading(text: string): ProofreadingResult {
  if (!text || text.trim().length === 0) {
    return { revisedText: '', issues: [] };
  }

  const issues: ProofreadIssue[] = [];
  let revised = text;

  // Typo: kiễm tra -> kiểm tra
  if (text.includes('kiễm tra')) {
    const orig = 'nghiên cứu kiễm tra';
    const target = text.includes(orig) ? orig : 'kiễm tra';
    const rep = target === orig ? 'nghiên cứu kiểm tra' : 'kiểm tra';
    const pos = text.indexOf(target);
    issues.push({
      category: 'spelling',
      original: target,
      replacement: rep,
      suggestion: rep,
      explanation: "Sai dấu thanh: 'kiễm' sửa thành 'kiểm'",
      severity: 'error',
      position: pos >= 0 ? pos : undefined,
      endIndex: pos >= 0 ? pos + target.length : undefined,
    });
    revised = revised.replace(target, rep);
  }

  // Administrative style: chúng tôi -> Đơn vị or xin gửi kèm theo
  if (text.includes('chúng tôi')) {
    const orig = text.includes('chúng tôi xin gửi kèm')
      ? 'chúng tôi xin gửi kèm'
      : 'chúng tôi';
    const rep = orig === 'chúng tôi xin gửi kèm' ? 'xin gửi kèm theo' : 'Đơn vị';
    const pos = text.indexOf(orig);
    issues.push({
      category: 'administrative_style',
      original: orig,
      replacement: rep,
      suggestion: rep,
      explanation: "Văn phong hành chính trang trọng nên tránh xưng hô 'chúng tôi'",
      severity: 'suggestion',
      position: pos >= 0 ? pos : undefined,
      endIndex: pos >= 0 ? pos + orig.length : undefined,
    });
    revised = revised.replace(orig, rep);
  }

  // Capitalization check: e.g. "tổng giám đốc" -> "Tổng Giám đốc"
  if (/tổng giám đốc(?!\s+Nguyễn)/i.test(text) && text.includes('tổng giám đốc')) {
    const orig = 'tổng giám đốc';
    const rep = 'Tổng Giám đốc';
    const pos = text.indexOf(orig);
    issues.push({
      category: 'capitalization',
      original: orig,
      replacement: rep,
      suggestion: rep,
      explanation: 'Viết hoa chức danh lãnh đạo theo Phụ lục II Nghị định 30/2020/NĐ-CP',
      severity: 'warning',
      position: pos >= 0 ? pos : undefined,
      endIndex: pos >= 0 ? pos + orig.length : undefined,
    });
    revised = revised.replace(orig, rep);
  }

  return {
    revisedText: revised,
    issues,
    tokensUsed: 30,
  };
}

/**
 * Handles mock template fill requests
 */
export function handleMockTemplateFill(
  schemaId: string,
  userNotes: string
): TemplateFillResult {
  const schema = getFormSchema(schemaId);
  const fields: Record<string, string | string[]> = {};
  const fieldDetails: ExtractedFieldItem[] = [];
  const unmappedTags: string[] = [];

  const schemaFieldIds = new Set(schema ? schema.fields.map((f) => f.id) : []);

  // Recipient (Kính gửi)
  const matchKinhGui =
    userNotes.match(/gửi\s+(?:cho\s+)?([^,.\n]+?)(?=\s+(?:về\s+việc|người\s+ký|ngày)|[,.\n]|$)/i) ||
    userNotes.match(/kính\s+gửi\s+([^,.\n]+?)(?=\s+(?:về\s+việc|người\s+ký|ngày)|[,.\n]|$)/i);
  if (matchKinhGui) {
    const val = matchKinhGui[1].trim();
    if (schemaFieldIds.has('KINH_GUI')) {
      fields.KINH_GUI = val;
      fieldDetails.push({ tag: 'KINH_GUI', value: val, confidence: 0.95, source: matchKinhGui[0] });
    }
  }

  // Subject summary (Trích yếu) with 'V/v ' prefix
  const matchTrichYeu =
    userNotes.match(/về\s+việc\s+([^,.\n]+?)(?=\s+(?:người\s+ký|ngày|kính\s+gửi)|[,.\n]|$)/i) ||
    userNotes.match(/trích\s+yếu\s+([^,.\n]+?)(?=\s+(?:người\s+ký|ngày|kính\s+gửi)|[,.\n]|$)/i);
  if (matchTrichYeu) {
    let val = matchTrichYeu[1].trim();
    if (!val.toLowerCase().startsWith('v/v')) {
      val = `V/v ${val}`;
    }
    if (schemaFieldIds.has('TRICH_YEU')) {
      fields.TRICH_YEU = val;
      fieldDetails.push({ tag: 'TRICH_YEU', value: val, confidence: 0.95, source: matchTrichYeu[0] });
    }
  }

  // Signer (Người ký)
  const matchNguoiKy =
    userNotes.match(/người\s+ký\s+([^,.\n]+?)(?=\s+(?:ngày|về\s+việc|kính\s+gửi)|[,.\n]|$)/i) ||
    userNotes.match(/ký\s+tên\s+([^,.\n]+?)(?=\s+(?:ngày|về\s+việc|kính\s+gửi)|[,.\n]|$)/i);
  if (matchNguoiKy) {
    const val = matchNguoiKy[1].trim();
    if (schemaFieldIds.has('NGUOI_KY')) {
      fields.NGUOI_KY = val;
      fieldDetails.push({ tag: 'NGUOI_KY', value: val, confidence: 0.92, source: matchNguoiKy[0] });
    }
  }

  // Department / Full name for don_nghi_phep
  const matchHoTen = userNotes.match(/họ\s+(?:và\s+)?tên\s+([^,.\n]+?)(?=\s+(?:ngày|về\s+việc|người\s+ký)|[,.\n]|$)/i);
  if (matchHoTen && schemaFieldIds.has('HO_TEN')) {
    const val = matchHoTen[1].trim();
    fields.HO_TEN = val;
    fieldDetails.push({ tag: 'HO_TEN', value: val, confidence: 0.94, source: matchHoTen[0] });
  }

  const confidence = fieldDetails.length > 0 ? 0.95 : 0.0;

  return {
    schemaId,
    fields,
    fieldDetails,
    confidence,
    unmappedTags,
  };
}
