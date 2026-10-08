import { Routes, Route } from "react-router-dom";
import AppBackground from "./components/AppBackground";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import EventDetail from "./pages/EventDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyBookings from "./pages/MyBookings";
import AdminEvents from "./pages/AdminEvents";

export default function App() {
  return (
    <>
      {/* Fixed animated dark background — rendered once for the whole app */}
      <AppBackground />

      <Navbar />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected: any authenticated user */}
        <Route
          path="/bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />

        {/* Protected: admin only */}
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute role="admin">
              <AdminEvents />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
