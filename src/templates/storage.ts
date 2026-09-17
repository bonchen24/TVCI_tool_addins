import type { TemplateRecord } from "./library";

const DB_NAME = "tvci-word-tools";
const DB_VERSION = 1;
const STORE = "templates";

interface StoredTemplate {
  id: string;
  record: TemplateRecord;
  data: ArrayBuffer;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không mở được kho biểu mẫu cục bộ."));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Không lưu được biểu mẫu."));
    tx.onabort = () => reject(tx.error ?? new Error("Giao dịch biểu mẫu bị hủy."));
  });
}

export async function saveUserTemplate(record: TemplateRecord, data: ArrayBuffer): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id: record.id, record, data } satisfies StoredTemplate);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function listUserTemplates(): Promise<TemplateRecord[]> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as StoredTemplate[]).map((item) => item.record));
      request.onerror = () => reject(request.error ?? new Error("Không đọc được kho biểu mẫu."));
    });
  } finally {
    db.close();
  }
}

export async function getUserTemplateData(storageId: string): Promise<ArrayBuffer> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(storageId);
      request.onsuccess = () => {
        const item = request.result as StoredTemplate | undefined;
        item ? resolve(item.data) : reject(new Error("Không tìm thấy file biểu mẫu cục bộ."));
      };
      request.onerror = () => reject(request.error ?? new Error("Không đọc được file biểu mẫu."));
    });
  } finally {
    db.close();
  }
}

export async function deleteUserTemplate(storageId: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(storageId);
    await txDone(tx);
  } finally {
    db.close();
  }
}
