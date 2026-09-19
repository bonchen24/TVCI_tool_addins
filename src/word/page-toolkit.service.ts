import { supportsDesktopPageSetup } from './page-formatting.service';

const POINTS_PER_MM = 72 / 25.4;
const mmToPoints = (mm: number) => mm * POINTS_PER_MM;

export async function applyA4Margins(): Promise<void> {
    if (!supportsDesktopPageSetup()) {
        throw new Error('Word hiện tại chưa hỗ trợ PageSetup API.');
    }
    await Word.run(async (context) => {
        const sections = context.document.sections;
        sections.load('items');
        await context.sync();
        
        for (const section of sections.items) {
            const setup = section.pageSetup;
            setup.paperSize = 'A4' as Word.PaperSize;
            setup.topMargin = mmToPoints(20);
            setup.bottomMargin = mmToPoints(20);
            setup.leftMargin = mmToPoints(30);
            setup.rightMargin = mmToPoints(15);
        }
        await context.sync();
    });
}

export async function autoFitTableToWindow(): Promise<boolean> {
    return Word.run(async (context) => {
        const selection = context.document.getSelection();
        let table = selection.tables.getFirstOrNullObject();
        table.load('isNullObject');
        await context.sync();
        
        if (table.isNullObject) {
            // Check if cursor is placed inside a table cell
            const parentTable = (selection as any).parentTableOrNullObject;
            if (parentTable) {
                parentTable.load('isNullObject');
                await context.sync();
                if (!parentTable.isNullObject) {
                    table = parentTable;
                }
            }
        }

        if (table.isNullObject) {
            // Fallback: if exactly 1 table exists in the document, autofit that table
            const docTables = context.document.body.tables;
            docTables.load('items');
            await context.sync();
            if (docTables.items.length === 1) {
                table = docTables.items[0];
            }
        }

        if (!table.isNullObject) {
            table.autoFitWindow();
            await context.sync();
            return true;
        }
        return false;
    });
}

export async function cleanBlankPagesSafe(): Promise<number> {
    return Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items');
        await context.sync();
        
        let deletedCount = 0;
        let remainingCount = paragraphs.items.length;

        // Delete completely empty paragraphs at the end of the document, but NEVER delete the only remaining paragraph
        for (let i = paragraphs.items.length - 1; i >= 0; i--) {
            if (remainingCount <= 1) break;
            const p = paragraphs.items[i];
            p.load('text');
            await context.sync();
            if (p.text.trim() === '') {
                p.delete();
                deletedCount++;
                remainingCount--;
            } else {
                break;
            }
        }
        if (deletedCount > 0) {
            await context.sync();
        }
        return deletedCount;
    });
}

export async function isolateTableLandscape(): Promise<void> {
    // This is a placeholder for the more complex logic to isolate a table in landscape
    // It requires adding section breaks before and after the table.
    throw new Error('Not implemented yet');
}
