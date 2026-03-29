import apiClient from "./client";

export async function loginRequest(payload) {
  const { data } = await apiClient.post("/auth/login", payload, {
    skipAuthRedirect: true,
  });
  return data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get("/users/me");
  return data;
}

export async function getVolunteers() {
  const { data } = await apiClient.get("/volunteers");
  return data;
}

export async function createVolunteer(payload) {
  const { data } = await apiClient.post("/volunteers", payload);
  return data;
}

export async function updateVolunteer(volunteerId, payload) {
  const { data } = await apiClient.put(`/volunteers/${volunteerId}`, payload);
  return data;
}

export async function deleteVolunteer(volunteerId) {
  await apiClient.delete(`/volunteers/${volunteerId}`);
}

export async function getVolunteerMe() {
  const { data } = await apiClient.get("/volunteer/me");
  return data;
}

export async function getVolunteerRescues() {
  const { data } = await apiClient.get("/volunteer/rescues");
  return data;
}

export async function getVolunteerRescue(rescueRequestId) {
  const { data } = await apiClient.get(`/volunteer/rescues/${rescueRequestId}`);
  return data;
}

export async function respondToVolunteerRescue(rescueRequestId, payload) {
  const { data } = await apiClient.post(`/volunteer/rescues/${rescueRequestId}/respond`, payload);
  return data;
}

export async function getVolunteerAlerts() {
  const { data } = await apiClient.get("/volunteer/alerts");
  return data;
}

export async function getRescueRequests() {
  const { data } = await apiClient.get("/rescue-requests");
  return data;
}

export async function getRescueRequest(rescueRequestId) {
  const { data } = await apiClient.get(`/rescue-requests/${rescueRequestId}`);
  return data;
}

export async function getRescueRequestMatches(rescueRequestId) {
  const { data } = await apiClient.get(`/rescue-requests/${rescueRequestId}/matches`);
  return data;
}

export async function generateRescueMessageDraft(rescueRequestId, volunteerId) {
  const { data } = await apiClient.post(`/rescue-requests/${rescueRequestId}/message-draft/${volunteerId}`);
  return data;
}

export async function createRescueRequest(payload) {
  const { data } = await apiClient.post("/rescue-requests", payload);
  return data;
}

export async function assignVolunteer(rescueRequestId, payload) {
  const { data } = await apiClient.post(`/rescue-requests/${rescueRequestId}/assign`, payload);
  return data;
}

export async function updateRescueRequestStatus(rescueRequestId, payload) {
  const { data } = await apiClient.patch(`/rescue-requests/${rescueRequestId}/status`, payload);
  return data;
}

export async function getDispatchLogs(filters = {}) {
  const params = {};

  if (filters.rescue_request_id) {
    params.rescue_request_id = filters.rescue_request_id;
  }

  if (filters.volunteer_id) {
    params.volunteer_id = filters.volunteer_id;
  }

  const { data } = await apiClient.get("/dispatch-logs", { params });
  return data;
}

export async function getChatMessages(rescueRequestId) {
  const { data } = await apiClient.get(`/chat/${rescueRequestId}`);
  return data;
}

export async function sendChatMessage(payload) {
  const { data } = await apiClient.post("/chat/send", payload);
  return data;
}

export async function assistRescueForm(payload) {
  const { data } = await apiClient.post("/ai/rescue-form-assist", payload);
  return data;
}

export async function getAiVolunteerRecommendation(rescueRequestId, payload) {
  const { data } = await apiClient.post(`/ai/recommend-volunteer/${rescueRequestId}`, payload);
  return data;
}

export async function generateAiMessageAssist(rescueRequestId, volunteerId, payload) {
  const { data } = await apiClient.post(`/ai/message-assist/${rescueRequestId}/${volunteerId}`, payload);
  return data;
}

export async function prepareSmartDispatch(rescueRequestId, payload) {
  const { data } = await apiClient.post(`/ai/smart-dispatch/${rescueRequestId}`, payload);
  return data;
}
