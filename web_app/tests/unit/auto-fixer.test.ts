import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import TextAlign from '@tiptap/extension-text-align';
import { AdministrativeParagraph } from '@/editor/extensions';
import { tiptapDocToSnapshots } from '@/editor/tiptap-adapter';
import {
  evaluateDocumentRules,
  issueToPatch,
  groupFixableIssues,
  applySafeFixes,
  applySingleFix,
  type ValidationIssue,
  type ParagraphSnapshot,
} from '@/rules';

describe('Auto-Fixer: One-Click Safe Format Fixes & 100% Convergence', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        AdministrativeParagraph,
        Text,
        Bold,
        Italic,
        TextAlign.configure({
          types: ['paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
        }),
      ],
      content: '<p>Văn bản thử nghiệm</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('converts validation issues to valid formatting patches', () => {
    const fontIssue: ValidationIssue = {
      id: 'node-0-font',
      ruleId: 'body.fontName',
      targetId: 'node-0',
      paragraphIndex: 0,
      category: 'body',
      message: 'Sai phông chữ',
      severity: 'error',
      status: 'FAIL',
      autoFixable: true,
      actual: 'Arial',
      expected: 'Times New Roman',
      fixValue: 'Times New Roman',
    };
    const patch = issueToPatch(fontIssue);
    expect(patch.fontName).toBe('Times New Roman');
    expect(patch.paragraphIndex).toBe(0);

    const alignIssue: ValidationIssue = {
      id: 'node-1-align',
      ruleId: 'body.alignment',
      targetId: 'node-1',
      paragraphIndex: 1,
      category: 'body',
      message: 'Sai căn lề',
      severity: 'error',
      status: 'FAIL',
      autoFixable: true,
      actual: 'Left',
      expected: 'Justified',
      fixValue: 'Justified',
    };
    const alignPatch = issueToPatch(alignIssue);
    expect(alignPatch.alignment).toBe('Justified');

    const indentIssue: ValidationIssue = {
      id: 'node-1-indent',
      ruleId: 'body.firstLineIndentMm',
      targetId: 'node-1',
      paragraphIndex: 1,
      category: 'body',
      message: 'Sai thụt đầu dòng',
      severity: 'error',
      status: 'FAIL',
      autoFixable: true,
      actual: 0,
      expected: 10,
      fixValue: 10,
    };
    const indentPatch = issueToPatch(indentIssue);
    expect(indentPatch.firstLineIndentMm).toBe(10);
  });

  it('groups multiple fixable issues for the same paragraph node', () => {
    const issues: ValidationIssue[] = [
      {
        id: 'node-2-font',
        ruleId: 'body.fontName',
        targetId: 'node-2',
        paragraphIndex: 2,
        category: 'body',
        message: 'Sai phông',
        severity: 'error',
        status: 'FAIL',
        autoFixable: true,
        actual: 'Calibri',
        expected: 'Times New Roman',
      },
      {
        id: 'node-2-size',
        ruleId: 'body.fontSize',
        targetId: 'node-2',
        paragraphIndex: 2,
        category: 'body',
        message: 'Sai cỡ',
        severity: 'error',
        status: 'FAIL',
        autoFixable: true,
        actual: 16,
        expected: 13,
      },
      {
        id: 'missing-text',
        ruleId: 'missing:author',
        targetId: 'missing:author',
        category: 'body',
        message: 'Thiếu tác giả',
        severity: 'error',
        status: 'MISSING',
        autoFixable: false,
        actual: 'Không có',
        expected: 'Tác giả',
      },
    ];

    const patchMap = groupFixableIssues(issues);
    expect(patchMap.size).toBe(1);
    const node2Patch = patchMap.get(2);
    expect(node2Patch).toBeDefined();
    expect(node2Patch?.fontName).toBe('Times New Roman');
    expect(node2Patch?.fontSize).toBe(13);
  });

  it('applies safe fixes to unstandardized document and brings health score to 100%', () => {
    // Document with standard administrative structure but broken formatting
    const docContent = `
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Độc lập - Tự do - Hạnh phúc</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Số: 12/TB-TVCI</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Hà Nội, ngày 29 tháng 9 năm 2026</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">THÔNG BÁO</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Về việc chuẩn hóa toàn bộ văn bản</p>
      <p style="font-family: Arial; font-size: 16pt; text-align: left; text-indent: 0mm; line-height: 1.8;">Thực hiện công tác rà soát thể thức theo Nghị định 30/2020/NĐ-CP, toàn bộ các quy cách cần được tự động chỉnh sửa an toàn.</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">GIÁM ĐỐC</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Nguyễn Văn A</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Nơi nhận: Như trên</p>
    `;

    editor.commands.setContent(docContent);

    // Initial audit: should have multiple formatting errors
    const initialSnapshots = tiptapDocToSnapshots(editor.getJSON());
    const initialSummary = evaluateDocumentRules(initialSnapshots, 'NĐ30_TVCI');
    expect(initialSummary.healthScore).toBeLessThan(70);
    expect(initialSummary.issues.length).toBeGreaterThan(0);

    // Apply safe fixes
    const fixResult = applySafeFixes(editor, initialSummary.issues);
    expect(fixResult.appliedCount).toBeGreaterThan(0);

    // Re-audit after fixes
    const fixedSnapshots = tiptapDocToSnapshots(editor.getJSON());
    const fixedSummary = evaluateDocumentRules(fixedSnapshots, 'NĐ30_TVCI');

    // All format violations on classified elements and body are now resolved!
    expect(fixedSummary.failedRules).toBe(0);
    expect(fixedSummary.healthScore).toBe(100);
  });

  it('applies single issue fix without modifying other nodes', () => {
    editor.commands.setContent(`
      <p style="font-family: Arial; font-size: 16pt;">Đoạn văn 1</p>
      <p style="font-family: Arial; font-size: 16pt;">Đoạn văn 2</p>
    `);

    const issue: ValidationIssue = {
      id: 'node-0-font',
      ruleId: 'body.fontName',
      targetId: 'node-0',
      paragraphIndex: 0,
      category: 'body',
      message: 'Sai phông',
      severity: 'error',
      status: 'FAIL',
      autoFixable: true,
      actual: 'Arial',
      expected: 'Times New Roman',
      fixValue: 'Times New Roman',
    };

    const success = applySingleFix(editor, issue);
    expect(success).toBe(true);

    const snapshots = tiptapDocToSnapshots(editor.getJSON());
    expect(snapshots[0].fontName).toBe('Times New Roman');
    expect(snapshots[1].fontName).toBe('Arial');
  });

  it('converts text punctuation issue to textReplacement patch and applies fix', () => {
    editor.commands.setContent('<p>Kính gửi Ban Giám đốc</p>');
    const initialSnapshots = tiptapDocToSnapshots(editor.getJSON());
    const initialSummary = evaluateDocumentRules(initialSnapshots, 'NĐ30_TVCI');
    const colonIssue = initialSummary.issues.find((i) => i.ruleId === 'text.addressee.colon');
    expect(colonIssue).toBeDefined();
    expect(colonIssue?.autoFixable).toBe(true);
    expect(colonIssue?.fixValue).toBe('Kính gửi: Ban Giám đốc');

    const patch = issueToPatch(colonIssue!);
    expect(patch.paragraphIndex).toBe(0);
    expect(patch.textReplacement).toBe('Kính gửi: Ban Giám đốc');

    const success = applySingleFix(editor, colonIssue!);
    expect(success).toBe(true);

    const updatedSnapshots = tiptapDocToSnapshots(editor.getJSON());
    expect(updatedSnapshots[0].text).toBe('Kính gửi: Ban Giám đốc');

    // Re-evaluating should resolve the colon issue
    const recheckedSummary = evaluateDocumentRules(updatedSnapshots, 'NĐ30_TVCI');
    const unresolvedColonIssue = recheckedSummary.issues.find((i) => i.ruleId === 'text.addressee.colon');
    expect(unresolvedColonIssue).toBeUndefined();
  });

  it('applies safe fixes to document with text punctuation errors and achieves 100% convergence', () => {
    const docContent = `
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Độc lập - Tự do - Hạnh phúc</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Số: 12/TB-TVCI</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Hà Nội, ngày 29 tháng 9 năm 2026</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">THÔNG BÁO</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Về việc chuẩn hóa toàn bộ văn bản</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Kính gửi Ban Giám đốc</p>
      <p style="font-family: Arial; font-size: 16pt; text-align: left; text-indent: 0mm; line-height: 1.8;">Thực hiện công tác rà soát thể thức theo Nghị định 30/2020/NĐ-CP, toàn bộ các quy cách cần được tự động chỉnh sửa an toàn.</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">GIÁM ĐỐC</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Nguyễn Văn A</p>
      <p style="font-family: Arial; font-size: 10pt; text-align: left;">Nơi nhận Như trên</p>
    `;

    editor.commands.setContent(docContent);

    // Initial audit: verify punctuation issues exist alongside format issues
    const initialSnapshots = tiptapDocToSnapshots(editor.getJSON());
    const initialSummary = evaluateDocumentRules(initialSnapshots, 'NĐ30_TVCI');
    expect(initialSummary.healthScore).toBeLessThan(70);
    expect(initialSummary.issues.some((i) => i.ruleId === 'text.addressee.colon')).toBe(true);
    expect(initialSummary.issues.some((i) => i.ruleId === 'text.recipients.colon')).toBe(true);

    // Apply safe fixes in a single atomic transaction
    const fixResult = applySafeFixes(editor, initialSummary.issues);
    expect(fixResult.appliedCount).toBeGreaterThanOrEqual(initialSummary.issues.filter((i) => i.autoFixable).length);

    // Verify document content was replaced
    const fixedSnapshots = tiptapDocToSnapshots(editor.getJSON());
    expect(fixedSnapshots[7].text).toBe('Kính gửi: Ban Giám đốc');
    expect(fixedSnapshots[11].text).toBe('Nơi nhận: Như trên');

    // Re-audit after fixes: 100% convergence!
    const fixedSummary = evaluateDocumentRules(fixedSnapshots, 'NĐ30_TVCI');
    expect(fixedSummary.failedRules).toBe(0);
    expect(fixedSummary.healthScore).toBe(100);
  });

  it('preserves existing text marks when replacing punctuation', () => {
    editor.commands.setContent('<p><b>Kính gửi Ban Giám đốc</b></p>');
    const colonIssue: ValidationIssue = {
      id: 'node-0-colon',
      ruleId: 'text.addressee.colon',
      targetId: 'node-0',
      paragraphIndex: 0,
      category: 'recipients',
      componentType: 'ADDRESSEE',
      message: 'Thiếu dấu hai chấm',
      severity: 'error',
      status: 'FAIL',
      autoFixable: true,
      actual: 'Kính gửi Ban Giám đốc',
      expected: 'Kính gửi: Ban Giám đốc',
      fixValue: 'Kính gửi: Ban Giám đốc',
    };

    const success = applySingleFix(editor, colonIssue);
    expect(success).toBe(true);

    const snapshots = tiptapDocToSnapshots(editor.getJSON());
    expect(snapshots[0].text).toBe('Kính gửi: Ban Giám đốc');
    expect(snapshots[0].bold).toBe(true);
  });
});
