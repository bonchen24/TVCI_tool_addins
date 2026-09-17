import type { KnowledgeRecord } from "./models";
import { SEED_KNOWLEDGE_RECORDS } from "./seed-data";

const DB_NAME = "tvci-knowledge-db";
const DB_VERSION = 1;
const STORE_NAME = "knowledge_records";
const LOCAL_STORAGE_KEY = "tvci_custom_knowledge_records";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB không khả dụng trong môi trường này."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Không thể mở cơ sở dữ liệu tri thức."));
  });
}

function loadFromLocalStorage(): KnowledgeRecord[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(records: KnowledgeRecord[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
    }
  } catch {}
}

export async function listCustomKnowledgeRecords(): Promise<KnowledgeRecord[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result as KnowledgeRecord[]);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return loadFromLocalStorage();
  }
}

export async function saveCustomKnowledgeRecord(record: KnowledgeRecord): Promise<void> {
  const updatedRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
  };

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(updatedRecord);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    const current = loadFromLocalStorage();
    const next = [updatedRecord, ...current.filter((r) => r.id !== updatedRecord.id)];
    saveToLocalStorage(next);
  }
}

export async function deleteCustomKnowledgeRecord(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    const current = loadFromLocalStorage();
    const next = current.filter((r) => r.id !== id);
    saveToLocalStorage(next);
  }
}

export async function getAllKnowledgeRecords(): Promise<KnowledgeRecord[]> {
  const custom = await listCustomKnowledgeRecords();
  const customMap = new Map(custom.map((r) => [r.id, r]));

  // Seed records are default, custom records with matching ID will override, new custom records will append
  const merged: KnowledgeRecord[] = [];
  for (const seed of SEED_KNOWLEDGE_RECORDS) {
    if (customMap.has(seed.id)) {
      const customItem = customMap.get(seed.id);
      if (customItem) merged.push(customItem);
      customMap.delete(seed.id);
    } else {
      merged.push(seed);
    }
  }

  // Add any remaining custom records
  for (const extra of customMap.values()) {
    merged.push(extra);
  }

  return merged;
}
