import React from "react";
import type { KnowledgeRecord } from "../../knowledge/models";
import { KnowledgeBaseView } from "./KnowledgeBaseView";

export interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: KnowledgeRecord[];
  onSaveRecord: (record: KnowledgeRecord) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
  onNotify: (msg: string) => void;
}

export function KnowledgeModal({
  isOpen,
  onClose,
  records,
  onSaveRecord,
  onDeleteRecord,
  onNotify,
}: KnowledgeModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalDialog knowledgeModalDialog" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">
            <span>🧠</span> Kho Tri Thức & Kinh Nghiệm Soạn Thảo
          </div>
          <button type="button" className="modalCloseBtn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        <div className="modalBody" style={{ maxHeight: "75vh", overflowY: "auto", padding: 0 }}>
          <KnowledgeBaseView
            records={records}
            onSaveRecord={onSaveRecord}
            onDeleteRecord={onDeleteRecord}
            onNotify={onNotify}
          />
        </div>

        <div className="modalFooter">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
