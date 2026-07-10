import { AppShell } from "./components/layout/AppShell";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  );
}
