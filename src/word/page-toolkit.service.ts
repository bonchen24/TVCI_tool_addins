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

export async function autoFitTableToWindow(): Promise<void> {
    await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const table = selection.tables.getFirstOrNullObject();
        table.load('isNullObject');
        await context.sync();
        
        if (!table.isNullObject) {
            table.autoFitWindow();
        }
        await context.sync();
    });
}

export async function cleanBlankPagesSafe(): Promise<void> {
    await Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load('items');
        await context.sync();
        
        // Delete completely empty paragraphs at the end of the document
        for (let i = paragraphs.items.length - 1; i >= 0; i--) {
            const p = paragraphs.items[i];
            p.load('text');
            await context.sync();
            if (p.text.trim() === '') {
                p.delete();
            } else {
                break;
            }
        }
        await context.sync();
    });
}

export async function isolateTableLandscape(): Promise<void> {
    // This is a placeholder for the more complex logic to isolate a table in landscape
    // It requires adding section breaks before and after the table.
    throw new Error('Not implemented yet');
}
