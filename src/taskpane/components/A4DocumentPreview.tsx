import React, { useState } from "react";
import type { TemplateRecord } from "../../templates/library";
import type { TemplateFormSchema, TemplateFormValues } from "../../templates/form-schema";
import { buildTemplateFormPreview, type TemplateFormPreview } from "../../templates/form-preview";

export interface A4DocumentPreviewProps {
  template: TemplateRecord;
  schema: TemplateFormSchema;
  values: TemplateFormValues;
}

export function A4DocumentPreview({
  template,
  schema,
  values,
}: A4DocumentPreviewProps): React.ReactElement {
  const [zoom, setZoom] = useState<number>(0.75); // 75% default per specification

  const preview: TemplateFormPreview = buildTemplateFormPreview(template, schema, values);
  const isParty = template.organization === "DANG";

  const getFieldValue = (tag: string): string => {
    const val = values[tag];
    if (Array.isArray(val)) return val.join(", ");
    return String(val ?? "").trim();
  };

  const signerTitle = getFieldValue("CHUC_VU_NGUOI_KY") || "GIÁM ĐỐC / TRƯỞNG ĐƠN VỊ";
  const signerName = getFieldValue("NGUOI_KY") || "(Chữ ký, họ và tên)";
  const docSymbol = getFieldValue("SO_VAN_BAN") || template.symbolHint || "Số: .../TVCI";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#e2e8f0",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Zoom and Preview Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 12px",
          background: "#0f3f67",
          color: "#ffffff",
          fontSize: "11.5px",
        }}
      >
        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <span>📄 Xem trước trang in A4</span>
          <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: 4 }}>
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
            style={{
              padding: "2px 7px",
              fontSize: "12px",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#ffffff",
              borderRadius: 3,
              cursor: "pointer",
            }}
            title="Thu nhỏ"
          >
            -
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.75)}
            style={{
              padding: "2px 7px",
              fontSize: "11px",
              background: zoom === 0.75 ? "#ffffff" : "rgba(255,255,255,0.15)",
              color: zoom === 0.75 ? "#0f3f67" : "#ffffff",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
              fontWeight: 600,
            }}
            title="Mặc định 75%"
          >
            75%
          </button>
          <button
            type="button"
            onClick={() => setZoom(1.0)}
            style={{
              padding: "2px 7px",
              fontSize: "11px",
              background: zoom === 1.0 ? "#ffffff" : "rgba(255,255,255,0.15)",
              color: zoom === 1.0 ? "#0f3f67" : "#ffffff",
              border: "none",
              borderRadius: 3,
              cursor: "pointer",
              fontWeight: 600,
            }}
            title="Kích thước thật 100%"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.25, Math.round((z + 0.1) * 10) / 10))}
            style={{
              padding: "2px 7px",
              fontSize: "12px",
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#ffffff",
              borderRadius: 3,
              cursor: "pointer",
            }}
            title="Phóng to"
          >
            +
          </button>
        </div>
      </div>

      {/* A4 Scrollable Viewport Container */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "16px 8px",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {/* A4 Paper Sheet */}
        <div
          style={{
            width: "595px", // Standard A4 width at 72dpi
            minHeight: "842px", // Standard A4 height at 72dpi
            background: "#ffffff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: "45px 35px",
            fontFamily: '"Times New Roman", Times, serif',
            color: "#000000",
            transformOrigin: "top center",
            transform: `scale(${zoom})`,
            marginBottom: `${(1 - zoom) * -500}px`,
            transition: "transform 0.15s ease",
            lineHeight: 1.35,
            fontSize: "13pt",
            boxSizing: "border-box",
          }}
        >
          {/* 1. Header Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 12, marginBottom: 16 }}>
            {/* Left Header */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "11pt", fontWeight: 400 }}>
                {preview.issuerLines[0] || "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"}
              </div>
              <div style={{ fontSize: "12pt", fontWeight: 700 }}>
                {preview.issuerLines[1] || "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP"}
              </div>
              <div style={{ width: "80px", height: "1px", background: "#000", margin: "4px auto 8px" }} />
              <div style={{ fontSize: "12pt" }}>{docSymbol}</div>
            </div>

            {/* Right Header */}
            <div style={{ textAlign: "center" }}>
              {!isParty ? (
                <>
                  <div style={{ fontSize: "12pt", fontWeight: 700 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div style={{ fontSize: "13pt", fontWeight: 700 }}>Độc lập - Tự do - Hạnh phúc</div>
                  <div style={{ width: "120px", height: "1px", background: "#000", margin: "4px auto 8px" }} />
                </>
              ) : (
                <>
                  <div style={{ fontSize: "13pt", fontWeight: 700 }}>ĐẢNG CỘNG SẢN VIỆT NAM</div>
                  <div style={{ width: "100px", height: "1px", background: "#000", margin: "4px auto 8px" }} />
                </>
              )}
              <div style={{ fontSize: "13pt", fontStyle: "italic" }}>
                {preview.date || "Hà Nội, ngày ... tháng ... năm ..."}
              </div>
            </div>
          </div>

          {/* 2. Document Title / Subject */}
          <div style={{ textAlign: "center", margin: "24px 0 16px" }}>
            <div style={{ fontSize: "15pt", fontWeight: 700, textTransform: "uppercase" }}>
              {template.documentType || "CÔNG VĂN"}
            </div>
            {preview.subject && (
              <div style={{ fontSize: "13pt", fontWeight: 600, marginTop: 4 }}>
                {preview.subject}
              </div>
            )}
          </div>

          {/* 3. Addressee (Kính gửi) */}
          {preview.addressee && (
            <div style={{ margin: "16px 0", fontSize: "13pt" }}>
              {preview.addressee.split("\n").map((line, idx) => (
                <div
                  key={idx}
                  style={{
                    fontWeight: idx === 0 ? 600 : 400,
                    paddingLeft: idx > 0 ? "24px" : "0",
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* 4. Body Content */}
          <div
            style={{
              margin: "20px 0",
              textAlign: "justify",
              minHeight: "160px",
              lineHeight: 1.45,
            }}
          >
            {preview.body ? (
              preview.body.split("\n").map((p, idx) => (
                <p key={idx} style={{ margin: "6px 0", textIndent: "1.25cm" }}>
                  {p}
                </p>
              ))
            ) : (
              <p style={{ color: "#94a3b8", fontStyle: "italic", textIndent: "1.25cm" }}>
                (Nội dung văn bản soạn thảo sẽ hiển thị tại đây khi bạn nhập vào biểu mẫu...)
              </p>
            )}
          </div>

          {/* 5. Footer Grid: Recipients (Left) & Signer (Right) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 32, pageBreakInside: "avoid" }}>
            {/* Recipients */}
            <div style={{ fontSize: "11pt", lineHeight: 1.3 }}>
              <div style={{ fontWeight: 700, fontStyle: "italic" }}>Nơi nhận:</div>
              <div>- Như trên;</div>
              {preview.recipients ? (
                preview.recipients.split("\n").map((r, idx) => <div key={idx}>- {r}</div>)
              ) : (
                <>
                  <div>- Giám đốc (để b/c);</div>
                  <div>- Lưu: VT, ĐĐT.</div>
                </>
              )}
            </div>

            {/* Signer */}
            <div style={{ textAlign: "center", fontSize: "13pt" }}>
              <div style={{ fontWeight: 700, textTransform: "uppercase" }}>{signerTitle}</div>
              <div style={{ height: "65px" }} />
              <div style={{ fontWeight: 700 }}>{signerName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
