import { RuleProfileId } from '../rules/profiles';
import { insertAddressee, insertRecipients } from '../word/drafting.service';

export async function quickInsertAddressee(profileId: RuleProfileId, addresseeText: string): Promise<void> {
    const lines = addresseeText.split('\n').map(l => l.trim()).filter(Boolean);
    // Chuẩn hóa dấu chấm phẩy
    const formatted = lines.map((line, index) => {
        let clean = line.replace(/[;,\.]$/, '');
        if (index === lines.length - 1) {
            return clean;
        }
        return clean + ';';
    });
    await insertAddressee(profileId, formatted);
}

export async function quickInsertRecipients(profileId: RuleProfileId, recipientsText: string): Promise<void> {
    const lines = recipientsText.split('\n').map(l => l.trim()).filter(Boolean);
    await insertRecipients(profileId, lines);
}

export async function quickInsertLegalBasis(profileId: RuleProfileId, text: string): Promise<void> {
    await Word.run(async (context) => {
        const selection = context.document.getSelection();
        // Căn cứ pháp lý thường in nghiêng, có chữ "Căn cứ" đầu dòng, kết thúc bằng dấu chấm phẩy.
        let clean = text.trim();
        if (!clean.toLowerCase().startsWith('căn cứ')) {
            clean = 'Căn cứ ' + clean;
        }
        if (!clean.endsWith(';')) {
            clean += ';';
        }
        const range = selection.insertText(clean, Word.InsertLocation.replace);
        range.font.italic = true;
        range.font.name = 'Times New Roman';
        range.font.size = 13;
        await context.sync();
    });
}

export async function quickInsertSigner(profileId: RuleProfileId, title: string, name: string): Promise<void> {
    await Word.run(async (context) => {
        const selection = context.document.getSelection();
        const text = `${title.toUpperCase()}\n\n\n\n\n${name}`;
        const range = selection.insertText(text, Word.InsertLocation.replace);
        range.font.bold = true;
        range.font.name = 'Times New Roman';
        range.font.size = 13;
        const paragraphs = range.paragraphs;
        paragraphs.load('items');
        await context.sync();
        for (const p of paragraphs.items) {
            p.alignment = Word.Alignment.centered;
        }
        await context.sync();
    });
}
