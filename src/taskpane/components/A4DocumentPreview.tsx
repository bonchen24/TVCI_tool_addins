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
  const [zoom, setZoom] = useState<number>(0.75); // Default 75% for comfortable viewing

  const preview: TemplateFormPreview = buildTemplateFormPreview(template, schema, values);
  const isParty = template.organization === "DANG";
  const docType = template.documentType || schema.documentType || "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "#cbd5e1",
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
            onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.1) * 10) / 10))}
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
            onClick={() => setZoom((z) => Math.min(1.3, Math.round((z + 0.1) * 10) / 10))}
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
        {/* A4 Paper Sheet (595px x 842px at 72dpi, standard ratio) */}
        <div
          style={{
            width: "595px",
            minHeight: "842px",
            background: "#ffffff",
            boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
            padding: "45px 38px",
            fontFamily: '"Times New Roman", Times, serif',
            color: "#000000",
            transformOrigin: "top center",
            transform: `scale(${zoom})`,
            marginBottom: `${(1 - zoom) * -450}px`,
            transition: "transform 0.15s ease",
            lineHeight: 1.35,
            fontSize: "13pt",
            boxSizing: "border-box",
          }}
        >
          {/* 1. Header Grid: Cơ quan ban hành (Trái) & Quốc hiệu / Tiêu ngữ (Phải) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.12fr", gap: 10, marginBottom: 14 }}>
            {/* Left Header: Agency & Symbol */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "10.5pt", fontWeight: 400, textTransform: "uppercase" }}>
                {preview.issuerLines[0] || "VIỆN CƠ KHÍ NĂNG LƯỢNG VÀ MỎ - VINACOMIN"}
              </div>
              <div style={{ fontSize: "11.5pt", fontWeight: 700, textTransform: "uppercase" }}>
                {preview.issuerLines[1] || "TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP"}
              </div>
              <div style={{ width: "90px", height: "1px", background: "#000", margin: "4px auto 6px" }} />
              <div style={{ fontSize: "11.5pt", fontWeight: 400 }}>
                {preview.docSymbol}
              </div>
              {/* If Công văn, show V/v right under docSymbol on the left */}
              {docType === "Công văn" && preview.subject && (
                <div style={{ fontSize: "11pt", fontStyle: "italic", marginTop: 4 }}>
                  {preview.subject}
                </div>
              )}
            </div>

            {/* Right Header: National Motto & Date */}
            <div style={{ textAlign: "center" }}>
              {!isParty ? (
                <>
                  <div style={{ fontSize: "11.5pt", fontWeight: 700, textTransform: "uppercase" }}>
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div style={{ fontSize: "12.5pt", fontWeight: 700 }}>
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div style={{ width: "135px", height: "1px", background: "#000", margin: "4px auto 6px" }} />
                </>
              ) : (
                <>
                  <div style={{ fontSize: "12pt", fontWeight: 700, textTransform: "uppercase" }}>
                    ĐẢNG CỘNG SẢN VIỆT NAM
                  </div>
                  <div style={{ width: "100px", height: "1px", background: "#000", margin: "4px auto 6px" }} />
                </>
              )}
              <div style={{ fontSize: "12.5pt", fontStyle: "italic" }}>
                {preview.date || "Hà Nội, ngày ... tháng ... năm ..."}
              </div>
            </div>
          </div>

          {/* 2. Document Body Rendered per Document Type (Theo chuẩn Nghị định 30) */}

          {/* CASE A: QUYẾT ĐỊNH */}
          {docType === "Quyết định" && (
            <div style={{ marginTop: 18 }}>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: "14pt", fontWeight: 700, textTransform: "uppercase" }}>
                  QUYẾT ĐỊNH
                </div>
                <div style={{ fontSize: "13pt", fontWeight: 700, marginTop: 4 }}>
                  {preview.subject ? (preview.subject.startsWith("Về việc") || preview.subject.startsWith("V/v") ? preview.subject : `Về việc ${preview.subject}`) : "Về việc ..."}
                </div>
              </div>

              <div style={{ textAlign: "center", fontSize: "13pt", fontWeight: 700, textTransform: "uppercase", margin: "14px 0 10px" }}>
                {preview.signerTitle}
              </div>

              {/* Legal Bases (Căn cứ pháp lý) */}
              <div style={{ margin: "10px 0", textAlign: "justify", fontStyle: "italic", fontSize: "12.5pt", lineHeight: 1.4 }}>
                {preview.legalBases.length > 0 ? (
                  preview.legalBases.map((base, idx) => {
                    const clean = base.trim().replace(/[;,.\s]+$/, "");
                    const isLast = idx === preview.legalBases.length - 1;
                    return (
                      <p key={idx} style={{ margin: "4px 0", textIndent: "1.25cm" }}>
                        {clean}{isLast ? "," : ";"}
                      </p>
                    );
                  })
                ) : (
                  <p style={{ color: "#94a3b8", textIndent: "1.25cm" }}>
                    *(Căn cứ pháp lý sẽ hiển thị tại đây khi bạn nhập vào ô Căn cứ)*
                  </p>
                )}
              </div>

              <div style={{ textAlign: "center", fontSize: "13.5pt", fontWeight: 700, margin: "14px 0 10px" }}>
                QUYẾT ĐỊNH:
              </div>

              {/* Articles (Các điều khoản) */}
              <div style={{ margin: "10px 0", textAlign: "justify", fontSize: "13pt", lineHeight: 1.45 }}>
                {preview.articles.length > 0 ? (
                  preview.articles.map((art, idx) => {
                    const trimmed = art.trim();
                    const hasPrefix = /^Điều\s+\d+/i.test(trimmed);
                    return (
                      <p key={idx} style={{ margin: "8px 0", textIndent: "1.25cm" }}>
                        {hasPrefix ? (
                          <>
                            <strong>{trimmed.split(".")[0]}.</strong>
                            {trimmed.slice(trimmed.indexOf(".") + 1)}
                          </>
                        ) : (
                          <>
                            <strong>Điều {idx + 1}.</strong> {trimmed}
                          </>
                        )}
                      </p>
                    );
                  })
                ) : (
                  <p style={{ color: "#94a3b8", fontStyle: "italic", textIndent: "1.25cm" }}>
                    *(Nội dung các Điều sẽ hiển thị tại đây khi bạn nhập vào ô Các điều và khoản)*
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CASE B: CÔNG VĂN */}
          {docType === "Công văn" && (
            <div style={{ marginTop: 20 }}>
              {/* Addressee (Kính gửi) */}
              {preview.addressee ? (
                <div style={{ margin: "16px 0", fontSize: "13pt" }}>
                  {preview.addressee.split("\n").map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontWeight: idx === 0 ? 700 : 400,
                        paddingLeft: idx > 0 ? "24px" : "0",
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ margin: "16px 0", fontSize: "13pt", color: "#94a3b8", fontStyle: "italic" }}>
                  Kính gửi: (Chưa nhập nơi nhận trực tiếp)
                </div>
              )}

              {/* Body Content */}
              <div style={{ margin: "20px 0", textAlign: "justify", minHeight: "140px", lineHeight: 1.45, fontSize: "13pt" }}>
                {preview.body ? (
                  preview.body.split("\n").map((p, idx) => (
                    <p key={idx} style={{ margin: "6px 0", textIndent: "1.25cm" }}>
                      {p}
                    </p>
                  ))
                ) : (
                  <p style={{ color: "#94a3b8", fontStyle: "italic", textIndent: "1.25cm" }}>
                    (Nội dung công văn sẽ hiển thị tại đây khi bạn nhập vào ô Nội dung...)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CASE C: TỜ TRÌNH */}
          {docType === "Tờ trình" && (
            <div style={{ marginTop: 18 }}>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontSize: "14pt", fontWeight: 700, textTransform: "uppercase" }}>
                  TỜ TRÌNH
                </div>
                <div style={{ fontSize: "13pt", fontWeight: 700, marginTop: 4 }}>
                  {preview.subject ? (preview.subject.startsWith("Về việc") || preview.subject.startsWith("V/v") ? preview.subject : `Về việc ${preview.subject}`) : "Về việc ..."}
                </div>
              </div>

              {preview.addressee && (
                <div style={{ margin: "12px 0", fontSize: "13pt" }}>
                  {preview.addressee.split("\n").map((l, i) => (
                    <div key={i} style={{ fontWeight: i === 0 ? 700 : 400, paddingLeft: i > 0 ? "20px" : "0" }}>
                      {l}
                    </div>
                  ))}
                </div>
              )}

              {preview.legalBases.length > 0 && (
                <div style={{ margin: "8px 0", textAlign: "justify", fontStyle: "italic", fontSize: "12.5pt" }}>
                  {preview.legalBases.map((b, i) => (
                    <p key={i} style={{ margin: "3px 0", textIndent: "1.25cm" }}>{b}</p>
                  ))}
                </div>
              )}

              <div style={{ margin: "14px 0", fontSize: "13pt", textAlign: "justify", lineHeight: 1.45 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>1. Lý do ban hành:</div>
                <p style={{ textIndent: "1.25cm", margin: "4px 0" }}>
                  {preview.reason || "(Chưa nhập lý do trình...)"}
                </p>

                <div style={{ fontWeight: 700, marginTop: 12, marginBottom: 4 }}>2. Đề xuất, kiến nghị:</div>
                <p style={{ textIndent: "1.25cm", margin: "4px 0" }}>
                  {preview.proposals || "(Chưa nhập đề xuất, kiến nghị...)"}
                </p>
              </div>
            </div>
          )}

          {/* CASE D: BIÊN BẢN */}
          {docType === "Biên bản" && (
            <div style={{ marginTop: 18 }}>
              <div style={{ textAlign: "center", marginBottom: 14 }}>
                <div style={{ fontSize: "14pt", fontWeight: 700, textTransform: "uppercase" }}>
                  BIÊN BẢN
                </div>
                <div style={{ fontSize: "13pt", fontWeight: 700, marginTop: 4 }}>
                  {preview.subject || "CUỘC HỌP"}
                </div>
              </div>

              <div style={{ fontSize: "13pt", lineHeight: 1.45, textAlign: "justify" }}>
                <p style={{ margin: "4px 0" }}>
                  <strong>Thời gian:</strong> {preview.timeText || "..."}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Địa điểm:</strong> {preview.location || "..."}
                </p>
                {preview.attendees.length > 0 && (
                  <p style={{ margin: "4px 0" }}>
                    <strong>Thành phần:</strong> {preview.attendees.join("; ")}
                  </p>
                )}

                <div style={{ fontWeight: 700, marginTop: 12 }}>Nội dung diễn biến:</div>
                <p style={{ textIndent: "1.25cm", margin: "4px 0" }}>
                  {preview.meetingContent || "(Chưa nhập nội dung diễn biến cuộc họp...)"}
                </p>

                <div style={{ fontWeight: 700, marginTop: 12 }}>Kết luận:</div>
                <p style={{ textIndent: "1.25cm", margin: "4px 0" }}>
                  {preview.conclusion || "(Chưa nhập kết luận cuộc họp...)"}
                </p>
              </div>
            </div>
          )}

          {/* CASE E: ĐƠN NGHỈ PHÉP */}
          {docType === "Đơn nghỉ phép" && (
            <div style={{ marginTop: 18 }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: "15pt", fontWeight: 700, textTransform: "uppercase" }}>
                  ĐƠN XIN NGHỈ PHÉP
                </div>
              </div>

              <div style={{ fontSize: "13pt", lineHeight: 1.5, textAlign: "justify" }}>
                <p style={{ margin: "6px 0", fontWeight: 700 }}>
                  Kính gửi: Ban Giám đốc, Phòng Tổ chức Lao động.
                </p>
                <p style={{ margin: "6px 0" }}>
                  Tôi tên là: <strong>{preview.applicantName || "...................................................."}</strong>
                </p>
                <p style={{ margin: "6px 0" }}>
                  Đơn vị công tác: <strong>{preview.applicantDept || "...................................................."}</strong>
                </p>
                <p style={{ margin: "6px 0" }}>
                  Nay tôi làm đơn này xin phép được nghỉ: <strong>{preview.leaveType || "Nghỉ phép"}</strong>
                </p>
                <p style={{ margin: "6px 0" }}>
                  Thời gian nghỉ: Từ ngày <strong>{preview.fromDate || "..../..../........"}</strong> đến ngày <strong>{preview.toDate || "..../..../........"}</strong>
                </p>
                <p style={{ margin: "6px 0" }}>
                  Lý do nghỉ: {preview.reason || "................................................................................"}
                </p>
                <p style={{ margin: "6px 0", fontStyle: "italic", textIndent: "1.25cm" }}>
                  Kính mong Ban Lãnh đạo xem xét và chấp thuận./.
                </p>
              </div>
            </div>
          )}

          {/* CASE F: THÔNG BÁO & CÁC VĂN BẢN KHÁC */}
          {docType !== "Quyết định" && docType !== "Công văn" && docType !== "Tờ trình" && docType !== "Biên bản" && docType !== "Đơn nghỉ phép" && (
            <div style={{ marginTop: 18 }}>
              <div style={{ textAlign: "center", margin: "16px 0" }}>
                <div style={{ fontSize: "14.5pt", fontWeight: 700, textTransform: "uppercase" }}>
                  {docType || "VĂN BẢN"}
                </div>
                {preview.subject && (
                  <div style={{ fontSize: "13pt", fontWeight: 600, marginTop: 4 }}>
                    {preview.subject}
                  </div>
                )}
              </div>

              {preview.addressee && (
                <div style={{ margin: "14px 0", fontSize: "13pt", fontWeight: 600 }}>
                  {preview.addressee}
                </div>
              )}

              <div style={{ margin: "18px 0", textAlign: "justify", lineHeight: 1.45, fontSize: "13pt", minHeight: "120px" }}>
                {preview.body ? (
                  preview.body.split("\n").map((p, idx) => (
                    <p key={idx} style={{ margin: "6px 0", textIndent: "1.25cm" }}>
                      {p}
                    </p>
                  ))
                ) : (
                  <p style={{ color: "#94a3b8", fontStyle: "italic", textIndent: "1.25cm" }}>
                    (Nội dung văn bản sẽ hiển thị tại đây khi bạn nhập vào biểu mẫu...)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 3. Footer Grid: Nơi nhận (Trái) & Người ký (Phải) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 34, pageBreakInside: "avoid" }}>
            {/* Nơi nhận (Left) */}
            <div style={{ fontSize: "11pt", lineHeight: 1.35 }}>
              <div style={{ fontWeight: 700, fontStyle: "italic" }}>Nơi nhận:</div>
              {preview.recipients ? (
                preview.recipients.split("\n").map((r, idx) => {
                  const line = r.trim();
                  if (!line) return null;
                  return (
                    <div key={idx}>
                      {line.startsWith("-") || line.startsWith("Lưu:") ? line : `- ${line}`}
                    </div>
                  );
                })
              ) : (
                <>
                  <div>- Như trên;</div>
                  <div>- Giám đốc (để b/c);</div>
                  <div>- Lưu: VT.</div>
                </>
              )}
            </div>

            {/* Người ký (Right) */}
            <div style={{ textAlign: "center", fontSize: "13pt" }}>
              <div style={{ fontWeight: 700, textTransform: "uppercase" }}>
                {preview.signerTitle}
              </div>
              <div style={{ height: "60px" }} />
              <div style={{ fontWeight: 700 }}>
                {preview.signerName || "(Ký và ghi rõ họ tên)"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
