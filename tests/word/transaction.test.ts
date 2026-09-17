import { StandardizationTransaction, TransactionManager, InMemoryTransactionRepository } from '../../src/word/transaction.service';
import type { ParagraphSnapshot, ValidationIssue } from '../../src/rules/models';

describe('Transaction Manager', () => {
    let repository: InMemoryTransactionRepository;
    let manager: TransactionManager;

    beforeEach(() => {
        repository = new InMemoryTransactionRepository();
        manager = new TransactionManager(repository);
    });

    it('should save a transaction and retrieve the latest', async () => {
        const patch: ParagraphSnapshot = {
            id: 'doc:p:0',
            text: 'Original Text',
            fontName: 'Arial',
            fontSize: 12,
            alignment: 'Left',
            spaceBefore: 0,
            spaceAfter: 0
        };

        const tx: StandardizationTransaction = {
            id: 'tx1',
            timestamp: new Date().toISOString(),
            ruleProfileId: 'NĐ30_TVCI',
            totalParagraphsChecked: 1,
            fixedCount: 1,
            manualReviewCount: 0,
            tablesProcessedCount: 0,
            blankPagesRemovedCount: 0,
            inversePatches: [patch]
        };

        await manager.commitTransaction(tx);
        const latest = await manager.getLatestTransaction();

        expect(latest).toBeDefined();
        expect(latest?.id).toBe('tx1');
        expect(latest?.inversePatches).toHaveLength(1);
        expect(latest?.inversePatches[0].fontName).toBe('Arial');
    });

    it('should calculate inverse patches correctly given original paragraphs and proposed patches', () => {
        const originalParagraphs: ParagraphSnapshot[] = [
            {
                id: 'doc:p:0',
                text: 'Kính gửi: Viện trưởng;',
                fontName: 'Arial',
                fontSize: 12,
                bold: false,
                italic: false,
                underline: false,
                alignment: 'Left',
                spaceBefore: 0,
                spaceAfter: 0,
                firstLineIndentMm: 0,
                lineSpacingPt: 12,
            }
        ];

        const issues: ValidationIssue[] = [
            {
                id: 'issue-1',
                ruleId: 'p.fontName',
                targetId: 'doc:p:0',
                message: 'Font must be Times New Roman',
                severity: 'error',
                autoFixable: true,
                actual: 'Arial',
                expected: 'Times New Roman'
            },
            {
                id: 'issue-2',
                ruleId: 'p.fontSize',
                targetId: 'doc:p:0',
                message: 'Font size must be 14',
                severity: 'error',
                autoFixable: true,
                actual: 12,
                expected: 14
            }
        ];

        const inversePatches = manager.calculateInversePatches(originalParagraphs, issues);
        
        expect(inversePatches).toHaveLength(1);
        expect(inversePatches[0].id).toBe('doc:p:0');
        expect(inversePatches[0].fontName).toBe('Arial'); // We save the original to restore it
        expect(inversePatches[0].fontSize).toBe(12);
        // Only fields that will be modified by issues need to be recorded in inverse patches?
        // Or we just save the full snapshot of any paragraph that has an issue?
        // The implementation plan says "Với mỗi lỗi cần sửa, lưu lại giá trị hiện tại (fontName, fontSize, alignment, margins...) vào inversePatches." 
        // It's safer to just save the entire original snapshot for any paragraph that is targeted.
    });

    it('should clear transactions', async () => {
        const tx: StandardizationTransaction = {
            id: 'tx1',
            timestamp: new Date().toISOString(),
            ruleProfileId: 'NĐ30_TVCI',
            totalParagraphsChecked: 1,
            fixedCount: 1,
            manualReviewCount: 0,
            tablesProcessedCount: 0,
            blankPagesRemovedCount: 0,
            inversePatches: []
        };

        await manager.commitTransaction(tx);
        await manager.clearHistory();
        const latest = await manager.getLatestTransaction();

        expect(latest).toBeNull();
    });
});
