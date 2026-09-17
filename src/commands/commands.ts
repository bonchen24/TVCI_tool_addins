import { applyA4Margins, autoFitTableToWindow, cleanBlankPagesSafe } from '../word/page-toolkit.service';
import { TransactionManager, StandardizationTransaction } from '../word/transaction.service';
import { inspectDocumentParagraphs, applyIssueFix, applyTextIssueFix } from '../word/formatting.service';
import { validateParagraph } from '../rules/validator';
import { getRuleProfile } from '../rules/profiles';
import { configurePageNumbers } from '../word/drafting.service';

function getGlobal() {
  return typeof self !== 'undefined' ? self :
         typeof window !== 'undefined' ? window :
         typeof global !== 'undefined' ? global :
         undefined;
}

const g = getGlobal() as any;
const txManager = new TransactionManager();

g.applyA4Margins = async (event: Office.AddinCommands.Event) => {
    try {
        await applyA4Margins();
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

g.autoFitTableToWindow = async (event: Office.AddinCommands.Event) => {
    try {
        await autoFitTableToWindow();
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

g.cleanBlankPagesSafe = async (event: Office.AddinCommands.Event) => {
    try {
        await cleanBlankPagesSafe();
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

g.togglePageNumbers = async (event: Office.AddinCommands.Event) => {
    try {
        // Just defaulting to true and IEMM profile for quick toggle, in a real scenario we'd use auto-detect or saved state
        await configurePageNumbers('IEMM', true);
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

g.run1ClickStandardize = async (event: Office.AddinCommands.Event) => {
    try {
        const profileId = 'IEMM'; // default, should use detected profile ideally
        const profile = getRuleProfile(profileId);
        const snapshots = await inspectDocumentParagraphs();
        const issues = snapshots.flatMap(snapshot => validateParagraph(snapshot, profile.body));
        
        const safeIssues = issues.filter(i => i.autoFixable);
        if (safeIssues.length > 0) {
            const inversePatches = txManager.calculateInversePatches(snapshots, safeIssues);
            
            let fixed = 0;
            for (const issue of safeIssues) {
                try {
                    if (issue.targetId === "page") {
                        // handled differently
                    }
                    else if (issue.ruleId.startsWith("text.")) await applyTextIssueFix(issue);
                    else await applyIssueFix(issue);
                    fixed++;
                } catch {
                    // Continue
                }
            }
            
            const tx: StandardizationTransaction = {
                id: `tx-${Date.now()}`,
                timestamp: new Date().toISOString(),
                ruleProfileId: profileId,
                totalParagraphsChecked: snapshots.length,
                fixedCount: fixed,
                manualReviewCount: issues.length - fixed,
                tablesProcessedCount: 0,
                blankPagesRemovedCount: 0,
                inversePatches
            };
            await txManager.commitTransaction(tx);
        }
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

g.runRollbackLastAction = async (event: Office.AddinCommands.Event) => {
    try {
        const tx = await txManager.getLatestTransaction();
        if (tx && tx.inversePatches.length > 0) {
            // Apply inverse patches logic...
        }
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

import { detectEncoding, convertTCVN3ToUnicode, convertVNIToUnicode } from '../word/unicode-converter.service';
import { cleanExtraSpaces, normalizePunctuation, fixManualLineBreaks } from '../word/cleanup.service';

g.convertSelectionToUnicode = async (event: Office.AddinCommands.Event) => {
    try {
        await Word.run(async (context) => {
            const range = context.document.getSelection();
            range.load("text");
            await context.sync();
            
            const encoding = detectEncoding(range.text);
            if (encoding === "TCVN3") {
                range.insertText(convertTCVN3ToUnicode(range.text), "Replace");
            } else if (encoding === "VNI") {
                range.insertText(convertVNIToUnicode(range.text), "Replace");
            }
            await context.sync();
        });
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

g.fixSpacingQuick = async (event: Office.AddinCommands.Event) => {
    try {
        await Word.run(async (context) => {
            const range = context.document.getSelection();
            range.load("text");
            await context.sync();
            range.insertText(cleanExtraSpaces(range.text), "Replace");
            await context.sync();
        });
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

g.fixManualLineBreaksCmd = async (event: Office.AddinCommands.Event) => {
    try {
        await Word.run(async (context) => {
            const range = context.document.getSelection();
            range.load("text");
            await context.sync();
            range.insertText(fixManualLineBreaks(range.text), "Replace");
            await context.sync();
        });
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

g.normalizePunctuationCmd = async (event: Office.AddinCommands.Event) => {
    try {
        await Word.run(async (context) => {
            const range = context.document.getSelection();
            range.load("text");
            await context.sync();
            range.insertText(normalizePunctuation(range.text), "Replace");
            await context.sync();
        });
    } catch (error) {
        console.error(error);
    }
    event.completed();
};

Office.onReady(function () {
  // Ribbon commands ready
});
