/**
 * AI Template Fill Assistant
 * Intelligent field suggestion and extraction from unstructured user notes into template schema.
 */

import {
  TemplateFillRequest,
  TemplateFillResult,
  ExtractedFieldItem,
  AiClientConfig,
} from './types';
import { getFormSchema } from '../templates/form-schema';
import { formatAdministrativeDate } from '../templates/form-validation';
import { DirectAiClient, isMockConfig } from './direct-client';
import { handleMockTemplateFill } from './mock-provider';
import { extractJson } from './proofreading';
import { isInjectionAttempt } from './administrative-rules';
import type { TemplateFormValue } from '../templates/types';

export const MIN_AUTO_FILL_CONFIDENCE = 0.8;

/**
 * Builds prompt for extracting template fields
 */
export function buildTemplateFillPrompt(
  schemaFields: Array<{ id: string; label: string; type: string }>,
  userNotes: string
): string {
  const fieldList = schemaFields
    .map((f) => `- ${f.id} (${f.label}): kiểu ${f.type}`)
    .join('\n');

  return [
    'Bạn là trợ lý AI trích xuất thông tin biểu mẫu hành chính theo Nghị định 30/2020/NĐ-CP.',
    'Hãy trích xuất thông tin từ ghi chú của người dùng để điền vào đúng các trường sau:',
    fieldList,
    'QUY TẮC BẮT BUỘC:',
    '1. Chỉ sử dụng đúng các mã trường (id) trong danh sách trên, KHÔNG TỰ TẠO TRƯỜNG MỚI.',
    '2. Trường TRICH_YEU nếu có phải bắt đầu bằng tiền tố "V/v " (ví dụ: "V/v báo cáo tiến độ...").',
    '3. Nếu ghi chú không có thông tin của trường thì bỏ qua hoặc để null.',
    '4. Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:',
    '{"fields": {"MA_TRUONG": "giá trị", ...}, "confidence": 0.95}',
    'Ghi chú của người dùng:',
    userNotes.trim(),
  ].join('\n\n');
}

/**
 * Core field extraction logic with heuristics and validation
 */
export function extractFieldsFromNotesHeuristic(
  notes: string,
  schemaId: string
): { fields: Record<string, string | string[]>; confidence: number } {
  const schema = getFormSchema(schemaId);
  const result: Record<string, string | string[]> = {};

  if (!notes || !notes.trim()) {
    return { fields: {}, confidence: 0 };
  }

  // Recipient (KINH_GUI)
  const matchKinhGui =
    notes.match(/(?:kính\s+gửi|gửi\s+cho|gửi\s+đến|gửi)\s+([^,.\n]+?)(?=\s+(?:về\s+việc|người\s+ký|ngày)|[,.\n]|$)/i);
  if (matchKinhGui) {
    result.KINH_GUI = matchKinhGui[1].trim();
  }

  // Subject summary (TRICH_YEU)
  const matchTrichYeu =
    notes.match(/(?:trích\s+yếu|về\s+việc)\s+([^,.\n]+?)(?=\s+(?:người\s+ký|ngày|kính\s+gửi)|[,.\n]|$)/i);
  if (matchTrichYeu) {
    let raw = matchTrichYeu[1].trim();
    if (raw.toLowerCase().startsWith('v/v')) {
      raw = raw.replace(/^v\/v\s*/i, '');
    }
    result.TRICH_YEU = `V/v ${raw}`;
  }

  // Signer name (NGUOI_KY)
  const matchNguoiKy =
    notes.match(/(?:người\s+ký|ký\s+tên|được\s+ký\s+bởi)\s+([^,.\n]+?)(?=\s+(?:ngày|về\s+việc|kính\s+gửi)|[,.\n]|$)/i);
  if (matchNguoiKy) {
    result.NGUOI_KY = matchNguoiKy[1].trim();
  }

  // Employee full name (HO_TEN)
  const matchHoTen = notes.match(/họ\s+(?:và\s+)?tên\s+([^,.\n]+)/i);
  if (matchHoTen) {
    result.HO_TEN = matchHoTen[1].trim();
  }

  // Date parsing
  const matchDate = notes.match(/ngày\s+(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/i);
  if (matchDate) {
    const d = Number(matchDate[1]);
    const m = Number(matchDate[2]);
    const y = Number(matchDate[3]);
    const dateFormatted = formatAdministrativeDate('Hà Nội', new Date(y, m - 1, d));
    result.NGAY_BAN_HANH = dateFormatted;
  }

  // Discard fields not present in schema
  if (schema) {
    const schemaFieldIds = new Set(schema.fields.map((f) => f.id));
    for (const k of Object.keys(result)) {
      if (!schemaFieldIds.has(k)) {
        delete result[k];
      }
    }
  }

  const confidence = Object.keys(result).length > 0 ? 0.95 : 0.0;
  return { fields: result, confidence };
}

export function validateTemplateFillRequest(req: Partial<TemplateFillRequest>): void {
  if (!req.schemaId) {
    throw new Error('Mã biểu mẫu không được để trống');
  }
  if (req.userNotes && isInjectionAttempt(req.userNotes)) {
    const hasLegitimateNotes = /(?:gửi\s+cho|người\s+ký|ngày|số|trích\s+yếu)/i.test(req.userNotes);
    if (!hasLegitimateNotes) {
      throw new Error('Ghi chú chứa chỉ dẫn không hợp lệ hoặc cố gắng ghi đè hệ thống');
    }
  }
}

/**
 * Executes AI template fill extraction
 */
export async function extractTemplateFields(
  request: TemplateFillRequest,
  fetchImpl?: typeof fetch
): Promise<TemplateFillResult> {
  validateTemplateFillRequest(request);

  const schemaId = request.schemaId;
  const userNotes = (request.userNotes || '').trim();
  const config: AiClientConfig = request.config || {
    provider: 'mock',
    apiKey: 'mock',
  };

  const schema = getFormSchema(schemaId);
  const schemaFieldIds = new Set(schema ? schema.fields.map((f) => f.id) : []);

  if (isMockConfig(config)) {
    return handleMockTemplateFill(schemaId, userNotes);
  }

  // Call LLM for extraction
  try {
    const client = new DirectAiClient(config, fetchImpl);
    const schemaFieldList = schema
      ? schema.fields.map((f) => ({ id: f.id, label: f.label, type: f.type }))
      : [];

    const prompt = buildTemplateFillPrompt(schemaFieldList, userNotes);
    const rawOutput = await client.generateText(prompt);

    const jsonStr = extractJson(rawOutput);
    const parsed = JSON.parse(jsonStr) as { fields?: Record<string, TemplateFormValue>; confidence?: number };
    const rawFields = parsed.fields || {};

    const validatedFields: Record<string, string | string[]> = {};
    const fieldDetails: ExtractedFieldItem[] = [];
    const unmappedTags: string[] = [];

    for (const [tag, val] of Object.entries(rawFields)) {
      if (schemaFieldIds.has(tag)) {
        if (val === null || val === undefined) continue;
        let finalVal: Exclude<TemplateFormValue, null | undefined> = val;
        if (tag === 'TRICH_YEU' && typeof finalVal === 'string' && !finalVal.startsWith('V/v ')) {
          finalVal = `V/v ${finalVal.replace(/^v\/v\s*/i, '')}`;
        }
        validatedFields[tag] = finalVal;
        fieldDetails.push({
          tag,
          value: finalVal,
          confidence: parsed.confidence || 0.9,
          reviewed: true,
        });
      } else {
        unmappedTags.push(tag);
      }
    }

    return {
      schemaId,
      fields: validatedFields,
      fieldDetails,
      confidence: parsed.confidence || (fieldDetails.length > 0 ? 0.92 : 0),
      unmappedTags,
    };
  } catch {
    // Graceful fallback to heuristic extraction
    const heuristic = extractFieldsFromNotesHeuristic(userNotes, schemaId);
    const fieldDetails: ExtractedFieldItem[] = Object.entries(heuristic.fields).map(
      ([tag, val]) => ({
        tag,
        value: val,
        confidence: heuristic.confidence,
        reviewed: true,
      })
    );

    return {
      schemaId,
      fields: heuristic.fields,
      fieldDetails,
      confidence: heuristic.confidence,
      unmappedTags: [],
    };
  }
}
