import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ChatPage } from "./pages/ChatPage";
import { DispatchLogsPage } from "./pages/DispatchLogsPage";
import { LoginPage } from "./pages/LoginPage";
import { MatchResultsPage } from "./pages/MatchResultsPage";
import { RescueDetailPage } from "./pages/RescueDetailPage";
import { RescueRequestsPage } from "./pages/RescueRequestsPage";
import { RoleHomePage } from "./pages/RoleHomePage";
import { VolunteerProfilePage } from "./pages/VolunteerProfilePage";
import { VolunteerRescueDetailPage } from "./pages/VolunteerRescueDetailPage";
import { VolunteerRescuesPage } from "./pages/VolunteerRescuesPage";
import { VolunteersPage } from "./pages/VolunteersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<RoleHomePage />} />
          <Route path="/chat" element={<ChatPage />} />

          <Route element={<ProtectedRoute allowedRoles={["admin", "coordinator"]} />}>
            <Route path="/rescue-requests" element={<RescueRequestsPage />} />
            <Route path="/rescue-requests/:rescueId" element={<RescueDetailPage />} />
            <Route path="/rescue-requests/:rescueId/matches" element={<MatchResultsPage />} />
            <Route path="/volunteers" element={<VolunteersPage />} />
            <Route path="/dispatch-logs" element={<DispatchLogsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["volunteer"]} />}>
            <Route path="/my-rescues" element={<VolunteerRescuesPage />} />
            <Route path="/my-rescues/:rescueId" element={<VolunteerRescueDetailPage />} />
            <Route path="/profile" element={<VolunteerProfilePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
