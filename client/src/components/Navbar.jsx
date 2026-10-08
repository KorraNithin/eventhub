import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        EventHub
      </Link>

      <ul className="navbar-links">
        <li>
          <NavLink to="/" end>
            Events
          </NavLink>
        </li>

        {/* Guest only */}
        {!user && (
          <>
            <li>
              <NavLink to="/login">Login</NavLink>
            </li>
            <li>
              <NavLink to="/register">Register</NavLink>
            </li>
          </>
        )}

        {/* Logged-in user */}
        {user && (
          <li>
            <NavLink to="/bookings">My Bookings</NavLink>
          </li>
        )}

        {/* Admin only */}
        {user?.role === "admin" && (
          <li>
            <NavLink to="/admin/events">Manage Events</NavLink>
          </li>
        )}

        {/* Logged-in: show name + logout */}
        {user && (
          <>
            <li className="navbar-user">Hi, {user.name}</li>
            <li>
              <button className="navbar-logout" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
