import axios from "axios";

import { clearAuthToken, getAuthToken } from "../utils/auth";

const configuredApiBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8000";

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/+$/, "");

console.log("API URL:", import.meta.env.VITE_API_URL);
console.log("Resolved API URL:", API_BASE_URL);

function stringifyValidationDetail(detail) {
  return detail
    .map((issue) => {
      if (typeof issue === "string") {
        return issue;
      }

      const path = Array.isArray(issue.loc) ? issue.loc.join(".") : "field";
      return `${path}: ${issue.msg}`;
    })
    .join(" | ");
}

export function getErrorMessage(error) {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return stringifyValidationDetail(detail);
  }

  if (detail && typeof detail === "object") {
    return JSON.stringify(detail);
  }

  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  return "Request failed";
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    error.userMessage = getErrorMessage(error);

    if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
      clearAuthToken();

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
