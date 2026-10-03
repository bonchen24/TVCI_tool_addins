/**
 * Vietnamese Administrative Date Formatting & Dynamic Form Validation
 * Strictly conforms to Nghị định 30/2020/NĐ-CP (Phụ lục I, Mục 4).
 */

import type { DocumentFormSchema, TemplateFormValues } from './types';

export const DOCUMENT_NUMBER_REGEX = /^\d+(?:\/\d{4})?\/[\p{L}\p{N}-]+$/u;

export interface DateParts {
  day: number;
  month: number;
  year: number;
}

/**
 * Checks whether the given day, month, year form a valid calendar date
 * Accounts for leap years and month lengths (e.g. Feb 31, April 31 are invalid).
 */
export function isValidCalendarDate(day: number, month: number, year: number): boolean {
  if (!year || !month || !day) return false;
  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * Extracts { day, month, year } from Date object, ISO string, slash format, or administrative text
 */
export function parseDateParts(value: Date | string | null | undefined): DateParts | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    };
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // ISO format: YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return isValidCalendarDate(day, month, year) ? { day, month, year } : null;
  }

  // Vietnamese slash format: DD/MM/YYYY
  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]);
    const year = Number(slashMatch[3]);
    return isValidCalendarDate(day, month, year) ? { day, month, year } : null;
  }

  // Administrative string: "... ngày DD tháng MM năm YYYY"
  const adminMatch = /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/iu.exec(raw);
  if (adminMatch) {
    const day = Number(adminMatch[1]);
    const month = Number(adminMatch[2]);
    const year = Number(adminMatch[3]);
    return isValidCalendarDate(day, month, year) ? { day, month, year } : null;
  }

  // Fallback try standard Date parse if it produces a valid date
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return {
      day: parsed.getDate(),
      month: parsed.getMonth() + 1,
      year: parsed.getFullYear(),
    };
  }

  return null;
}

export function isValidDateString(value: string): boolean {
  return parseDateParts(value) !== null;
}

export function validateDate(value: Date | string): { valid: boolean; message?: string } {
  const parts = parseDateParts(value);
  if (!parts) {
    return {
      valid: false,
      message: 'Ngày tháng không hợp lệ (định dạng hợp lệ: YYYY-MM-DD hoặc DD/MM/YYYY)',
    };
  }
  return { valid: true };
}

/**
 * Format date per Nghị định 30/2020/NĐ-CP:
 * - Days 1..9: pad leading zero ("ngày 01", "ngày 05", "ngày 09")
 * - Months 1, 2: pad leading zero ("tháng 01", "tháng 02")
 * - Months 3..12: DO NOT pad leading zero ("tháng 3", "tháng 9", "tháng 12")
 *
 * Supports two signatures:
 *   formatAdministrativeDate(place, date) -> "Hà Nội, ngày 05 tháng 9 năm 2026"
 *   formatAdministrativeDate(date) -> defaults place to "Hà Nội"
 */
export function formatAdministrativeDate(
  placeOrDate: string | Date,
  dateInput?: Date | string
): string {
  let place = 'Hà Nội';
  let targetDate: Date | string | null = null;

  if (dateInput !== undefined) {
    place = typeof placeOrDate === 'string' ? placeOrDate.trim() : 'Hà Nội';
    targetDate = dateInput;
  } else {
    if (placeOrDate instanceof Date) {
      targetDate = placeOrDate;
    } else {
      const raw = String(placeOrDate).trim();
      const adminMatch = /^([^,]+),\s*ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/iu.exec(raw);
      if (adminMatch) {
        place = adminMatch[1].trim();
        const day = Number(adminMatch[2]);
        const month = Number(adminMatch[3]);
        const year = Number(adminMatch[4]);
        if (isValidCalendarDate(day, month, year)) {
          const dayStr = day < 10 ? `0${day}` : `${day}`;
          const monthStr = month < 3 ? `0${month}` : `${month}`;
          return `${place}, ngày ${dayStr} tháng ${monthStr} năm ${year}`;
        }
        return raw;
      }
      targetDate = raw;
    }
  }

  const parts = parseDateParts(targetDate);
  if (!parts) {
    return typeof targetDate === 'string' ? targetDate : '';
  }

  const { day, month, year } = parts;
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  const monthStr = month < 3 ? `0${month}` : `${month}`;

  return `${(place || 'Hà Nội').trim()}, ngày ${dayStr} tháng ${monthStr} năm ${year}`;
}

export function formatDateForUi(value: Date | string): string {
  const parts = parseDateParts(value);
  if (!parts) return typeof value === 'string' ? value : '';
  return `${String(parts.day).padStart(2, '0')}/${String(parts.month).padStart(2, '0')}/${parts.year}`;
}

export function normalizeDateInputValue(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (parseDateParts(raw)) return formatDateForUi(raw);

  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function validateDocumentNumber(value: string): { valid: boolean; message?: string } {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return { valid: false, message: 'Số ký hiệu không được để trống' };
  }
  if (!DOCUMENT_NUMBER_REGEX.test(trimmed)) {
    return {
      valid: false,
      message: `Số ký hiệu "${trimmed}" không đúng định dạng quy định (vd: 123/QĐ-TVCI hoặc 102/TVCI-VP)`,
    };
  }
  return { valid: true };
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates dynamic form values against schema requirements.
 * Resolves both field.id, field.tag, and field.aliases.
 */
export function validateFormValues(
  schema: DocumentFormSchema,
  data: TemplateFormValues
): FormValidationResult {
  const errors: Record<string, string> = {};

  if (!schema || !schema.fields) {
    return { isValid: true, errors: {} };
  }

  for (const field of schema.fields) {
    // Resolve value from id, tag, or aliases
    let val = data[field.id];
    if (val === undefined && field.tag) val = data[field.tag];
    if (val === undefined && field.aliases) {
      for (const alias of field.aliases) {
        if (data[alias] !== undefined) {
          val = data[alias];
          break;
        }
      }
    }

    if (field.required) {
      const isMissing =
        val === undefined ||
        val === null ||
        (field.type === 'repeatable'
          ? !Array.isArray(val) || val.length === 0 || val.every((x) => !String(x).trim())
          : String(val).trim() === '');

      if (isMissing) {
        const errorMsg = `Trường ${field.id} không được để trống`;
        errors[field.id] = errorMsg;
        if (field.tag && field.tag !== field.id) errors[field.tag] = errorMsg;
        continue;
      }
    }

    if (val === undefined || val === null || String(val).trim() === '') {
      continue;
    }

    // Document number validation
    if (field.id === 'SO_KY_HIEU' || field.validationType === 'documentNumber') {
      const numRes = validateDocumentNumber(String(val));
      if (!numRes.valid && numRes.message) {
        errors[field.id] = numRes.message;
        if (field.tag) errors[field.tag] = numRes.message;
      }
    }

    // Date validation
    if (field.type === 'date' || field.validationType === 'date') {
      const dateRes = validateDate(String(val));
      if (!dateRes.valid && dateRes.message) {
        errors[field.id] = dateRes.message;
        if (field.tag) errors[field.tag] = dateRes.message;
      }
    }
  }

  // Cross-field date check (e.g. TU_NGAY / DEN_NGAY)
  const from = data.TU_NGAY ?? data.startDate;
  const to = data.DEN_NGAY ?? data.endDate;
  if (from && to && isValidDateString(String(from)) && isValidDateString(String(to))) {
    const pFrom = parseDateParts(String(from))!;
    const pTo = parseDateParts(String(to))!;
    const tFrom = Date.UTC(pFrom.year, pFrom.month - 1, pFrom.day);
    const tTo = Date.UTC(pTo.year, pTo.month - 1, pTo.day);
    if (tFrom > tTo) {
      const targetKey = data.DEN_NGAY !== undefined ? 'DEN_NGAY' : 'endDate';
      errors[targetKey] = 'Ngày kết thúc không được trước ngày bắt đầu';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/** Direct map getter for backward compatibility */
export function validateDocumentForm(
  schema: DocumentFormSchema,
  data: TemplateFormValues
): Record<string, string> {
  return validateFormValues(schema, data).errors;
}

/**
 * Normalizes values: trims text, strips redundant 'V/v:', formats date
 */
export function normalizeTemplateFormValues(
  schema: DocumentFormSchema,
  values: TemplateFormValues
): TemplateFormValues {
  const normalized: TemplateFormValues = { ...values };

  for (const field of schema.fields) {
    const val = values[field.id] ?? (field.tag ? values[field.tag] : undefined);
    if (val === undefined) continue;

    if (field.id === 'TRICH_YEU' || field.tag === 'TRICH_YEU') {
      const str = String(val).trim();
      const dup = /^((?:v\/v|về việc)(?:\s*:\s*|\s+))(?:v\/v|về việc)(?:\s*:\s*|\s+)([\s\S]+)$/iu.exec(str);
      normalized[field.id] = dup ? `${dup[1]}${dup[2]}` : str;
    } else if (field.type === 'date' || field.id === 'NGAY_BAN_HANH') {
      normalized[field.id] = formatAdministrativeDate(
        typeof values.place === 'string' ? values.place : 'Hà Nội',
        String(val)
      );
    } else if (field.type === 'repeatable') {
      normalized[field.id] = Array.isArray(val)
        ? val.map((x) => String(x).trim()).filter(Boolean)
        : String(val)
            .split(/\r?\n/)
            .map((x) => x.trim())
            .filter(Boolean);
    } else {
      normalized[field.id] = typeof val === 'string' ? val.trim() : val;
    }
  }

  return normalized;
}
