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

  const isDialog = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("dialog") === "1";

  const content = (
    <div
      className={`knowledgeModalDialog ${isDialog ? "dialogRootWindow" : "modalDialog"}`}
      style={isDialog ? { width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" } : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modalHeader">
        <div className="modalTitle">
          <span>🧠</span> Kho Tri Thức &amp; Kinh Nghiệm Soạn Thảo
        </div>
        <button type="button" className="modalCloseBtn" onClick={onClose} title="Đóng">
          ✕
        </button>
      </div>

      <div className="modalBody" style={{ flex: 1, overflowY: "auto", padding: 0 }}>
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
  );

  if (isDialog) {
    return content;
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      {content}
    </div>
  );
}
