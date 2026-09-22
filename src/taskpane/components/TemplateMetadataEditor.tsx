import React, { useState } from "react";
import type { TemplateRecord } from "../../templates/library";
import type { UserTemplateUpdateInput } from "../../templates/user-template";

export interface TemplateMetadataEditorProps {
  template: TemplateRecord;
  onCancel: () => void;
  onSave: (input: UserTemplateUpdateInput) => Promise<void>;
}

export function TemplateMetadataEditor({
  template,
  onCancel,
  onSave,
}: TemplateMetadataEditorProps): React.ReactElement {
  const [name, setName] = useState(template.name);
  const [documentType, setDocumentType] = useState(template.documentType);
  const [version, setVersion] = useState(template.version);
  const [keywords, setKeywords] = useState(template.keywords.join(", "));
  const [description, setDescription] = useState(template.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({ name, documentType, version, keywords, description });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      aria-label="Chỉnh sửa thông tin biểu mẫu"
      style={{ background: "#ffffff", border: "1px solid #bfdbfe", borderRadius: 6, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: "#0f3f67", fontSize: 12 }}>Sửa thông tin biểu mẫu</strong>
        <button type="button" onClick={onCancel} disabled={busy} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}>
          ✕
        </button>
      </div>

      <label style={{ fontSize: 10.5, fontWeight: 600 }}>
        Tên biểu mẫu
        <input value={name} onChange={(event) => setName(event.target.value)} required style={{ width: "100%", marginTop: 3, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 10.5, fontWeight: 600 }}>
          Loại văn bản
          <input value={documentType} onChange={(event) => setDocumentType(event.target.value)} style={{ width: "100%", marginTop: 3, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
        </label>
        <label style={{ fontSize: 10.5, fontWeight: 600 }}>
          Phiên bản
          <input value={version} onChange={(event) => setVersion(event.target.value)} required style={{ width: "100%", marginTop: 3, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
        </label>
      </div>
      <label style={{ fontSize: 10.5, fontWeight: 600 }}>
        Từ khóa <span style={{ color: "#64748b", fontWeight: 400 }}>(cách nhau bằng dấu phẩy)</span>
        <input value={keywords} onChange={(event) => setKeywords(event.target.value)} style={{ width: "100%", marginTop: 3, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4 }} />
      </label>
      <label style={{ fontSize: 10.5, fontWeight: 600 }}>
        Mô tả
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} style={{ width: "100%", marginTop: 3, padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 4, resize: "vertical" }} />
      </label>

      {error && <div role="alert" style={{ color: "#b91c1c", fontSize: 10.5 }}>{error}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <button type="button" onClick={onCancel} disabled={busy} style={{ padding: "5px 10px" }}>Hủy</button>
        <button type="submit" className="primary" disabled={busy} style={{ padding: "5px 12px" }}>{busy ? "Đang lưu..." : "Lưu thay đổi"}</button>
      </div>
    </form>
  );
}
