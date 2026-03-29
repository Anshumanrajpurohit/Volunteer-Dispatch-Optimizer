import { useAuth } from "../hooks/useAuth";
import { DashboardPage } from "./DashboardPage";
import { VolunteerDashboardPage } from "./VolunteerDashboardPage";

export function RoleHomePage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();

  if (role === "volunteer") {
    return <VolunteerDashboardPage />;
  }

  return <DashboardPage />;
}
