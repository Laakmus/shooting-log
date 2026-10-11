import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Kit } from "./views/Kit";
import { Stats } from "./views/Stats";
import { TrainingDetails } from "./views/TrainingDetails";
import { Trainings } from "./views/Trainings";
import { WeaponDetails } from "./views/WeaponDetails";
import { Weapons } from "./views/Weapons";

// Hash routing keeps page addresses (/#/weapons) apart from API paths (/weapons/).
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/trainings" element={<Trainings />} />
          <Route path="/trainings/:id" element={<TrainingDetails />} />
          <Route path="/weapons" element={<Weapons />} />
          <Route path="/weapons/:id" element={<WeaponDetails />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/_kit" element={<Kit />} />
          <Route path="*" element={<Navigate to="/trainings" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
