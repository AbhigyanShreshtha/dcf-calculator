import { Routes, Route } from "react-router-dom";

import { AppShell } from "./components/layout/app-shell";
import { CompareScenariosPage } from "./pages/compare-scenarios-page";
import { DashboardPage } from "./pages/dashboard";
import { EditValuationPage } from "./pages/edit-valuation-page";
import { NewValuationPage } from "./pages/new-valuation-page";
import { SavedModelsPage } from "./pages/saved-models-page";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/valuations/new" element={<NewValuationPage />} />
        <Route path="/valuations/:id" element={<EditValuationPage />} />
        <Route path="/models" element={<SavedModelsPage />} />
        <Route path="/compare" element={<CompareScenariosPage />} />
      </Routes>
    </AppShell>
  );
}
