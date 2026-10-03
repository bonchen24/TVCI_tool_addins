'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import type { ResourceEntry } from '@/drive/resources';

type StorageTab = 'documents' | 'templates' | 'knowledge' | 'references';
type ListedResource = Pick<ResourceEntry, 'fileId' | 'title' | 'category' | 'createdAt' | 'updatedAt'> & { tags?: string[] };

const TABS: Array<{ id: StorageTab; label: string; api: string }> = [
  { id: 'documents', label: 'Tài liệu', api: 'documents' },
  { id: 'templates', label: 'Thư viện cá nhân', api: 'templates' },
  { id: 'knowledge', label: 'Tri thức', api: 'knowledge' },
  { id: 'references', label: 'Tham khảo', api: 'references' },
];

export function PersonalStoragePanel({
  driveConnected,
  currentDocument,
  onOpenDocument,
  onApplyTemplate,
  selectedContextItems = [],
  onSelectedContextItemsChange,
}: {
  driveConnected: boolean;
  currentDocument?: { title: string; content: unknown };
  onOpenDocument?: (document: ResourceEntry) => void;
  onApplyTemplate?: (template: ResourceEntry) => void;
  selectedContextItems?: ResourceEntry[];
  onSelectedContextItemsChange?: (items: ResourceEntry[]) => void;
}) {
  const [tab, setTab] = useState<StorageTab>('documents');
  const [resources, setResources] = useState<ListedResource[]>([]);
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function refreshList(nextTab = tab, query = search) {
    if (!driveConnected) return;
    const response = await fetch(`/api/drive/${nextTab}?search=${encodeURIComponent(query)}`);
    const result = await response.json();
    if (response.ok) setResources(result.resources || []);
    else setError(result.error || 'Không thể tải dữ liệu Drive.');
  }

  useEffect(() => {
    setResources([]);
    setError('');
    void refreshList(tab, search);
    // List changes are deliberate tab/search actions, not background content indexing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, driveConnected]);

  async function saveResource() {
    setError('');
    let resourceContent = tab === 'documents' ? currentDocument?.content : tab === 'templates' && currentDocument && !editingResourceId ? currentDocument.content : content;
    if (tab === 'templates' && typeof resourceContent === 'string') {
      try { resourceContent = JSON.parse(resourceContent); }
      catch { return setError('Nội dung mẫu phải là JSON hợp lệ.'); }
    }
    const requestBody = tab === 'documents'
      ? { title: currentDocument?.title || title, content: currentDocument?.content }
      : tab === 'templates' && currentDocument
        ? { title: title || currentDocument.title, content: resourceContent }
        : { title, content: resourceContent, ...(tags.trim() ? { tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean) } : {}) };
    const response = await fetch(`/api/drive/${tab}${editingResourceId ? `/${editingResourceId}` : ''}`, {
      method: editingResourceId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể lưu vào Google Drive.');
    setMessage('Đã lưu vào Google Drive.');
    setTitle(''); setContent(''); setTags(''); setEditingResourceId(null);
    await refreshList(tab, search);
  }

  async function openResource(resource: ListedResource) {
    const response = await fetch(`/api/drive/${tab}/${resource.fileId}`);
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể mở mục đã chọn.');
    if (tab === 'documents') onOpenDocument?.(result.resource);
    if (tab === 'templates') onApplyTemplate?.(result.resource);
    if (tab === 'knowledge' || tab === 'references') {
      setEditingResourceId(result.resource.fileId);
      setTitle(result.resource.title);
      setContent(typeof result.resource.content === 'string' ? result.resource.content : JSON.stringify(result.resource.content, null, 2));
      setTags((result.resource.tags || []).join(', '));
    }
  }

  async function editResource(resource: ListedResource) {
    setError('');
    const response = await fetch(`/api/drive/${tab}/${resource.fileId}`);
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể mở mục đã chọn.');
    setEditingResourceId(resource.fileId);
    setTitle(result.resource.title);
    setContent(typeof result.resource.content === 'string' ? result.resource.content : JSON.stringify(result.resource.content, null, 2));
    setTags((result.resource.tags || []).join(', '));
  }

  async function renameResource(resource: ListedResource) {
    const nextTitle = window.prompt('Tên mới', resource.title)?.trim();
    if (!nextTitle) return;
    const response = await fetch(`/api/drive/${tab}/${resource.fileId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: nextTitle }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể đổi tên mục.');
    await refreshList(tab, search);
  }

  async function deleteResource(resource: ListedResource) {
    if (!window.confirm(`Xóa "${resource.title}" khỏi Google Drive?`)) return;
    const response = await fetch(`/api/drive/${tab}/${resource.fileId}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: true }),
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể xóa mục.');
    setResources((items) => items.filter((item) => item.fileId !== resource.fileId));
    if (editingResourceId === resource.fileId) { setEditingResourceId(null); setTitle(''); setContent(''); setTags(''); }
  }

  async function toggleContext(resource: ListedResource, checked: boolean) {
    setError('');
    if (!checked) {
      const next = selectedContextItems.filter((item) => item.fileId !== resource.fileId);
      onSelectedContextItemsChange?.(next);
      return;
    }
    const response = await fetch(`/api/drive/${resource.category}/${resource.fileId}`);
    const result = await response.json();
    if (!response.ok) return setError(result.error || 'Không thể đọc nội dung đã chọn.');
    const next = [...selectedContextItems.filter((item) => item.fileId !== resource.fileId), result.resource as ResourceEntry];
    onSelectedContextItemsChange?.(next);
  }

  async function importReferenceFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    setContent(await file.text());
    event.target.value = '';
  }

  const saveLabel = tab === 'knowledge' ? 'Lưu vào Tri thức'
    : tab === 'references' ? 'Thêm vào Tham khảo'
      : tab === 'templates' ? 'Lưu mẫu cá nhân'
        : 'Lưu bản sao vào Drive';

  return <section className="space-y-3" aria-label="Lưu trữ cá nhân trên Google Drive">
    <div role="tablist" aria-label="Danh mục lưu trữ cá nhân" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
      {TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => { setTab(item.id); setMessage(''); }} className={`rounded-md px-2 py-2 text-xs font-semibold ${tab === item.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>{item.label}</button>)}
    </div>

    {!driveConnected ? <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
      <p className="font-semibold text-amber-950">Drive cần thiết để lưu dài hạn</p>
      <p className="text-xs leading-5 text-amber-900">Không kết nối Drive thì Tri thức, Thư viện cá nhân và tài liệu không được lưu lâu dài. Nội dung hiện tại vẫn có thể xuất DOCX.</p>
      {/* Keep full-page navigation so the server's OAuth redirect is followed by the browser. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/drive/connect" className="inline-flex rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Kết nối Google Drive để lưu</a>
      <button type="button" disabled className="block w-full rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-500">{saveLabel}</button>
    </div> : <>
      {tab === 'templates' && <p className="text-xs text-slate-500">Mẫu hệ thống nằm riêng trong tab Biểu mẫu; đây là các mẫu cá nhân trong Drive.</p>}
      {tab === 'knowledge' && <p className="text-xs text-slate-500">Chỉ lưu khi bạn bấm nút bên dưới. Không tự học từ văn bản hoặc AI.</p>}
      {tab === 'references' && <><p className="text-xs text-slate-500">Tệp tham khảo không tự chuyển sang Tri thức. Nhập văn bản .txt, .md hoặc .json để lưu.</p><label className="block text-xs font-medium">Nhập tệp tham khảo<input type="file" accept=".txt,.md,.json,text/plain,application/json" onChange={importReferenceFile} className="mt-1 block w-full text-xs" /></label></>}
      {(tab !== 'documents' || !currentDocument) && <label className="block text-xs font-medium">{tab === 'knowledge' ? 'Tiêu đề tri thức' : tab === 'references' ? 'Tiêu đề tham khảo' : 'Tên mục'}<input aria-label={tab === 'knowledge' ? 'Tiêu đề tri thức' : tab === 'references' ? 'Tiêu đề tham khảo' : 'Tên mục'} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" /></label>}
      {(tab === 'knowledge' || tab === 'references' || tab === 'templates' && editingResourceId) && <label className="block text-xs font-medium">{tab === 'knowledge' ? 'Nội dung tri thức' : tab === 'references' ? 'Nội dung tham khảo' : 'Nội dung mẫu cá nhân'}<textarea aria-label={tab === 'knowledge' ? 'Nội dung tri thức' : tab === 'references' ? 'Nội dung tham khảo' : 'Nội dung mẫu cá nhân'} value={content} onChange={(event) => setContent(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" /></label>}
      {(tab === 'knowledge' || tab === 'references') && <label className="block text-xs font-medium">Thẻ tùy chọn<input value={tags} onChange={(event) => setTags(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs" /></label>}
      {(tab === 'documents' && currentDocument || tab === 'templates' && (currentDocument || editingResourceId) || tab === 'knowledge' && title.trim() && content.trim() || tab === 'references' && title.trim() && content.trim()) && <button type="button" onClick={saveResource} className="w-full rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white">{editingResourceId ? tab === 'templates' ? 'Cập nhật mẫu cá nhân' : tab === 'knowledge' ? 'Cập nhật mục tri thức' : tab === 'references' ? 'Cập nhật tham khảo' : saveLabel : saveLabel}</button>}
      {editingResourceId && <button type="button" onClick={() => { setEditingResourceId(null); setTitle(''); setContent(''); setTags(''); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs">Hủy chỉnh sửa</button>}

      <div className="flex gap-1"><input aria-label="Tìm trong danh mục" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-xs" placeholder="Tìm trong danh mục…" /><button type="button" onClick={() => void refreshList(tab, search)} className="rounded-lg border border-slate-300 px-2 text-xs">Tìm</button></div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
      {tab !== 'documents' && (tab === 'knowledge' || tab === 'references') && <p className="text-[11px] text-slate-500">Mục đã chọn chỉ được gửi trong yêu cầu AI kế tiếp, sau đó sẽ được bỏ chọn.</p>}
      <ul className="space-y-2">
        {resources.map((resource) => <li key={resource.fileId} className="rounded-lg border border-slate-200 p-2.5">
          <div className="flex items-start justify-between gap-2"><strong className="min-w-0 break-words text-xs text-slate-800">{resource.title}</strong>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => void openResource(resource)} className="text-xs font-semibold text-indigo-700">{tab === 'documents' ? 'Mở' : tab === 'templates' ? 'Dùng mẫu' : 'Xem / sửa'}</button>
              {tab !== 'documents' && <button type="button" onClick={() => void editResource(resource)} className="text-xs text-slate-600">Sửa</button>}
              <button type="button" onClick={() => void renameResource(resource)} className="text-xs text-slate-600">Đổi tên</button>
              <button type="button" onClick={() => void deleteResource(resource)} className="text-xs text-rose-700">Xóa</button>
            </div>
          </div>
          {(tab === 'knowledge' || tab === 'references') && <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600"><input type="checkbox" checked={selectedContextItems.some((item) => item.fileId === resource.fileId)} onChange={(event) => void toggleContext(resource, event.target.checked)} />Chọn cho yêu cầu AI kế tiếp</label>}
        </li>)}
      </ul>
      {!resources.length && <p className="py-4 text-center text-xs text-slate-400">Chưa có mục trong danh mục này.</p>}
    </>}
  </section>;
}
