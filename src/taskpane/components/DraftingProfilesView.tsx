import React, { useState, useEffect } from "react";
import { profileStorage, type UserDraftingProfile } from "../../profiles/profile-storage";

export function DraftingProfilesView() {
  const [profiles, setProfiles] = useState<UserDraftingProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [organization, setOrganization] = useState<"TVCI" | "IEMM" | "DANG">("TVCI");
  const [department, setDepartment] = useState("");
  const [defaultLocation, setDefaultLocation] = useState("");
  const [defaultSymbolPrefix, setDefaultSymbolPrefix] = useState("");

  const refresh = () => setProfiles(profileStorage.getProfiles());

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = () => {
    setEditingId("new");
    setFullName("");
    setJobTitle("");
    setOrganization("TVCI");
    setDepartment("");
    setDefaultLocation("");
    setDefaultSymbolPrefix("");
  };

  const handleEdit = (profile: UserDraftingProfile) => {
    setEditingId(profile.id);
    setFullName(profile.fullName);
    setJobTitle(profile.jobTitle);
    setOrganization(profile.organization);
    setDepartment(profile.department);
    setDefaultLocation(profile.defaultLocation);
    setDefaultSymbolPrefix(profile.defaultSymbolPrefix);
  };

  const handleSave = () => {
    if (!fullName.trim()) return alert("Vui lòng nhập họ tên.");
    const newProfile: UserDraftingProfile = {
      id: editingId === "new" ? `prof-${Date.now()}` : editingId!,
      fullName,
      jobTitle,
      organization,
      department,
      defaultLocation,
      defaultSymbolPrefix,
      commonSigners: [],
      commonRecipients: [],
      isDefault: false
    };
    
    // Maintain default state
    const existing = profiles.find(p => p.id === newProfile.id);
    if (existing) newProfile.isDefault = existing.isDefault;
    
    profileStorage.saveProfile(newProfile);
    setEditingId(null);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Xóa hồ sơ này?")) {
      profileStorage.deleteProfile(id);
      refresh();
    }
  };

  const handleSetDefault = (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      profile.isDefault = true;
      profileStorage.saveProfile(profile);
      refresh();
    }
  };

  return (
    <div className="sectionGroup">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <strong>Hồ sơ soạn thảo & Tự điền</strong>
        {editingId === null && (
          <button type="button" onClick={handleCreate}>➕ Thêm hồ sơ</button>
        )}
      </div>

      {editingId !== null ? (
        <div style={{ background: "#f8fafc", padding: 10, borderRadius: 5, border: "1px solid #cbd5e1" }}>
          <div className="grid2">
            <label>
              Họ và tên
              <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nhập họ và tên người ký" />
            </label>
            <label>
              Chức vụ / Chức danh
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="VD: Giám đốc" />
            </label>
            <label>
              Cơ quan / Đơn vị
              <select value={organization} onChange={e => setOrganization(e.target.value as any)}>
                <option value="TVCI">Trung tâm Thử nghiệm - Kiểm định Công nghiệp</option>
                <option value="IEMM">Viện Cơ khí Năng lượng và Mỏ - Vinacomin</option>
                <option value="DANG">Văn bản Đảng</option>
              </select>
            </label>
            <label>
              Phòng ban
              <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="VD: Phòng Kỹ thuật" />
            </label>
            <label>
              Địa danh mặc định
              <input value={defaultLocation} onChange={e => setDefaultLocation(e.target.value)} placeholder="VD: Hà Nội" />
            </label>
            <label>
              Hậu tố số/Ký hiệu
              <input value={defaultSymbolPrefix} onChange={e => setDefaultSymbolPrefix(e.target.value)} placeholder="VD: /TVCI-KT" />
            </label>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
            <button type="button" className="primary" onClick={handleSave}>Lưu hồ sơ</button>
            <button type="button" onClick={() => setEditingId(null)}>Hủy</button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {profiles.length === 0 ? (
            <div className="empty">Chưa có hồ sơ. Thêm hồ sơ để tự động điền Form.</div>
          ) : (
            profiles.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: p.isDefault ? "#f0fdf4" : "#fff", padding: "6px 10px", border: "1px solid", borderColor: p.isDefault ? "#86efac" : "#e2e8f0", borderRadius: 4 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "12px", display: "flex", alignItems: "center", gap: 5 }}>
                    {p.isDefault && <span title="Hồ sơ mặc định">⭐</span>}
                    {p.fullName} - {p.jobTitle}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "#64748b" }}>{p.department} ({p.organization})</div>
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {!p.isDefault && <button type="button" onClick={() => handleSetDefault(p.id)}>Đặt mặc định</button>}
                  <button type="button" onClick={() => handleEdit(p)}>Sửa</button>
                  <button type="button" onClick={() => handleDelete(p.id)}>Xóa</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
