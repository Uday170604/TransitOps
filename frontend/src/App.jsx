import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import RoleGate from './components/auth/RoleGate.jsx'
import AppShell from './components/layout/AppShell.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import VehiclesPage from './pages/VehiclesPage.jsx'
import DriversPage from './pages/DriversPage.jsx'
import TripsPage from './pages/TripsPage.jsx'
import MaintenancePage from './pages/MaintenancePage.jsx'
import FuelExpensesPage from './pages/FuelExpensesPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import UnauthorizedPage from './pages/UnauthorizedPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />

        <Route
          path="/vehicles"
          element={
            <RoleGate moduleKey="vehicles">
              <VehiclesPage />
            </RoleGate>
          }
        />
        <Route
          path="/drivers"
          element={
            <RoleGate moduleKey="drivers">
              <DriversPage />
            </RoleGate>
          }
        />
        <Route
          path="/trips"
          element={
            <RoleGate moduleKey="trips">
              <TripsPage />
            </RoleGate>
          }
        />
        <Route
          path="/maintenance"
          element={
            <RoleGate moduleKey="maintenance">
              <MaintenancePage />
            </RoleGate>
          }
        />
        <Route
          path="/fuel-expenses"
          element={
            <RoleGate moduleKey="fuelExpenses">
              <FuelExpensesPage />
            </RoleGate>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleGate moduleKey="reports">
              <ReportsPage />
            </RoleGate>
          }
        />

        <Route
          path="/settings"
          element={
            <RoleGate moduleKey="settings">
              <SettingsPage />
            </RoleGate>
          }
        />

        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
