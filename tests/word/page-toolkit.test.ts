import { applyA4Margins, autoFitTableToWindow } from '../../src/word/page-toolkit.service';

type PageSetupMock = {
    paperSize: string;
    topMargin: number;
    bottomMargin: number;
    leftMargin: number;
    rightMargin: number;
};

type ContextMock = {
    document: {
        sections: {
            load: jest.Mock;
            items: Array<{ pageSetup: PageSetupMock }>;
        };
        getSelection: jest.Mock;
    };
    sync: jest.Mock;
};

describe('Page Toolkit', () => {
    let activeContext: ContextMock;
    let previousWord: any;
    let previousOffice: any;

    beforeEach(() => {
        const sections = [
            {
                pageSetup: {
                    paperSize: 'Letter',
                    topMargin: 0,
                    bottomMargin: 0,
                    leftMargin: 0,
                    rightMargin: 0
                }
            }
        ];
        
        activeContext = {
            document: {
                sections: {
                    load: jest.fn(),
                    items: sections
                },
                getSelection: jest.fn()
            },
            sync: jest.fn().mockResolvedValue(undefined)
        };

        previousWord = (globalThis as any).Word;
        (globalThis as any).Word = {
            run: jest.fn(async (cb) => cb(activeContext))
        };

        previousOffice = (globalThis as any).Office;
        (globalThis as any).Office = {
            context: {
                requirements: {
                    isSetSupported: jest.fn().mockReturnValue(true)
                }
            }
        };
    });

    afterEach(() => {
        (globalThis as any).Word = previousWord;
        (globalThis as any).Office = previousOffice;
    });

    it('should apply A4 margins correctly', async () => {
        await applyA4Margins();
        
        const setup = activeContext.document.sections.items[0].pageSetup;
        expect(setup.paperSize).toBe('A4');
        expect(Math.round(setup.topMargin * (25.4 / 72))).toBe(20);
        expect(Math.round(setup.bottomMargin * (25.4 / 72))).toBe(20);
        expect(Math.round(setup.leftMargin * (25.4 / 72))).toBe(30);
        expect(Math.round(setup.rightMargin * (25.4 / 72))).toBe(15);
    });
    
    it('should autofit table to window', async () => {
        const tableMock = {
            autoFitWindow: jest.fn(),
            load: jest.fn(),
            isNullObject: false
        };
        activeContext.document.getSelection.mockReturnValue({
            tables: {
                getFirstOrNullObject: jest.fn().mockReturnValue(tableMock)
            }
        });

        await autoFitTableToWindow();
        expect(tableMock.autoFitWindow).toHaveBeenCalled();
    });
});
