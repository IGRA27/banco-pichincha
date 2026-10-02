/** Token lives in sessionStorage only: it dies with the tab and is never persisted across browser restarts. */
const KEY = "oa.token";
const USER_KEY = "oa.user";

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const getToken = () => safe(() => sessionStorage.getItem(KEY), null);
export const getStoredUser = () => safe(() => sessionStorage.getItem(USER_KEY), null);

export function setToken(token: string, username: string) {
  safe(() => {
    sessionStorage.setItem(KEY, token);
    sessionStorage.setItem(USER_KEY, username);
  }, undefined);
}

export function clearToken() {
  safe(() => {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(USER_KEY);
  }, undefined);
}

type Listener = () => void;
const listeners = new Set<Listener>();
export function onUnauthorized(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export const notifyUnauthorized = () => listeners.forEach((fn) => fn());
