const EVENT_NAME = "marketday:local-storage";

export function subscribeLocalStorage(key, listener) {
  if (typeof window === "undefined") return () => {};

  function saatStorageBerubah(event) {
    if (event.key === key || event.key === null) listener();
  }

  function saatPerubahanLokal(event) {
    if (event.detail?.key === key) listener();
  }

  window.addEventListener("storage", saatStorageBerubah);
  window.addEventListener(EVENT_NAME, saatPerubahanLokal);

  return () => {
    window.removeEventListener("storage", saatStorageBerubah);
    window.removeEventListener(EVENT_NAME, saatPerubahanLokal);
  };
}

export function getLocalStorageSnapshot(key) {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key) ?? "";
  } catch (error) {
    console.error(`Gagal membaca localStorage dengan key "${key}".`, error);
    return "";
  }
}

export function getServerStorageSnapshot() {
  return null;
}

export function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Gagal menyimpan localStorage dengan key "${key}".`, error);
    throw new Error("Data tidak dapat disimpan di browser ini.", {
      cause: error,
    });
  }

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { key },
    }),
  );
}
