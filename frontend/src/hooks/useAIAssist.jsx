import { useState } from "react";

import apiClient from "../api/client";

export function useAIAssist(endpoint, initialPayload = null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  async function runAssist(overridePayload = initialPayload) {
    setLoading(true);
    setError("");

    try {
      const { data: responseData } = await apiClient.post(endpoint, overridePayload ?? {});
      setData(responseData);
      return responseData;
    } catch (requestError) {
      const message = requestError.userMessage || "Unable to complete AI assist.";
      setError(message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setData(null);
    setError("");
  }

  return {
    loading,
    error,
    data,
    runAssist,
    reset,
  };
}
