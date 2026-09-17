import type { ParagraphSnapshot, ValidationIssue } from '../rules/models';

export interface StandardizationTransaction {
  id: string;
  timestamp: string;
  ruleProfileId: string;
  totalParagraphsChecked: number;
  fixedCount: number;
  manualReviewCount: number;
  tablesProcessedCount: number;
  blankPagesRemovedCount: number;
  inversePatches: ParagraphSnapshot[];
  pageSetupBefore?: {
    paperSize: string;
    orientation: string;
    topMm: number;
    bottomMm: number;
    leftMm: number;
    rightMm: number;
  };
}

export interface ITransactionRepository {
  getLatest(): Promise<StandardizationTransaction | null>;
  save(transaction: StandardizationTransaction): Promise<void>;
  clear(): Promise<void>;
}

export class InMemoryTransactionRepository implements ITransactionRepository {
  private latestTransaction: StandardizationTransaction | null = null;

  async getLatest(): Promise<StandardizationTransaction | null> {
    return this.latestTransaction;
  }

  async save(transaction: StandardizationTransaction): Promise<void> {
    this.latestTransaction = transaction;
  }

  async clear(): Promise<void> {
    this.latestTransaction = null;
  }
}

export class TransactionManager {
  constructor(private repository: ITransactionRepository = new InMemoryTransactionRepository()) {}

  async commitTransaction(transaction: StandardizationTransaction): Promise<void> {
    await this.repository.save(transaction);
  }

  async getLatestTransaction(): Promise<StandardizationTransaction | null> {
    return await this.repository.getLatest();
  }

  async clearHistory(): Promise<void> {
    await this.repository.clear();
  }

  calculateInversePatches(originalParagraphs: ParagraphSnapshot[], proposedIssues: ValidationIssue[]): ParagraphSnapshot[] {
    const targetIds = new Set(proposedIssues.map((issue) => issue.targetId));
    return originalParagraphs.filter((p) => targetIds.has(p.id));
  }
}
