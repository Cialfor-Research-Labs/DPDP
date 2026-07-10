import { Navigate, Route, Routes } from "react-router-dom";
import { AuditListPage } from "../features/audits/AuditListPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ReportPage } from "../features/reports/ReportPage";
import { ReviewQueuePage } from "../features/review/ReviewQueuePage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/audits" element={<AuditListPage />} />
      <Route path="/review" element={<ReviewQueuePage />} />
      <Route path="/reports" element={<ReportPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
