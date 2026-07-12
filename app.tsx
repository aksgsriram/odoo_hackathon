import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import AssetDetails from "./pages/AssetDetails";
import Bookings from "./pages/Bookings";
import Maintenance from "./pages/Maintenance";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

function App() {
  const isAuthenticated = true; // Replace with your auth logic

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />

        <div className="flex flex-col flex-1">
          <Navbar />

          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />

              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/assets/:id" element={<AssetDetails />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
