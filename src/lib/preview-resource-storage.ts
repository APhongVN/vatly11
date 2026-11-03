const DATABASE_NAME = "vatly11-local-preview";
const STORE_NAME = "learning-resources";
const DATABASE_VERSION = 1;
const STATE_RECORD_ID = "__vatly11_preview_state__";

type PreviewStateRecord<T> = T | { id: typeof STATE_RECORD_ID; previewState: true };

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Trình duyệt này không hỗ trợ lưu tài liệu cục bộ."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error || new Error("Không mở được kho tài liệu cục bộ."));
    request.onblocked = () => reject(new Error("Kho tài liệu đang được dùng ở tab khác. Hãy tải lại trang."));
  });
}

export async function loadPreviewResources<T extends { id: string }>(): Promise<{ resources: T[]; isInitialized: boolean }> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const records = request.result as PreviewStateRecord<T>[];
        const initialized = records.some((record) => record.id === STATE_RECORD_ID);
        const resources = records.filter((record): record is T => record.id !== STATE_RECORD_ID);
        resolve({ resources, isInitialized: initialized || resources.length > 0 });
      };
      request.onerror = () => reject(request.error || new Error("Không đọc được kho tài liệu cục bộ."));
      transaction.onabort = () => reject(transaction.error || new Error("Không đọc được kho tài liệu cục bộ."));
    });
  } finally {
    database.close();
  }
}

export async function savePreviewResourceChanges<T extends { id: string }>(upserts: readonly T[], removals: readonly string[]): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Không lưu được kho tài liệu cục bộ."));
      transaction.onabort = () => reject(transaction.error || new Error("Không lưu được kho tài liệu cục bộ."));

      const store = transaction.objectStore(STORE_NAME);
      store.put({ id: STATE_RECORD_ID, previewState: true });
      for (const id of removals) store.delete(id);
      for (const resource of upserts) store.put(resource);
    });
  } finally {
    database.close();
  }
}
