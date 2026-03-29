export const TOKEN_STORAGE_KEY = "vr_dispatch_token";
export const AUTH_STATE_EVENT = "vr-auth-state";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT));
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT));
}
