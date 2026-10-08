import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./MyBookings.css";

// ── Helpers ──────────────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatPrice(price, seats) {
  if (price === 0) return { label: "Free", free: true };
  return {
    label: `₹${Number(price * seats).toLocaleString("en-IN")}`,
    free: false,
  };
}

// ── Skeleton ─────────────────────────────────────────────────
function SkeletonList({ count = 4 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div className="booking-skeleton" key={i}>
          <div className="bsk bsk--title" />
          <div className="bsk bsk--medium" />
          <div className="bsk bsk--short" />
        </div>
      ))}
    </div>
  );
}

// ── Single booking card ───────────────────────────────────────
function BookingCard({ booking, onCancel }) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const ev = booking.event; // may be null if event was deleted
  const isDeleted = ev === null;
  const isCancelled = booking.status === "cancelled";
  const isPast = ev ? new Date(ev.date) <= new Date() : true;
  const canCancel = !isCancelled && !isPast && !isDeleted;

  const price = isDeleted
    ? null
    : formatPrice(ev.price, booking.seats);

  async function handleCancel() {
    if (!window.confirm("Cancel this booking? Your seats will be released.")) return;
    setCancelError("");
    setCancelling(true);
    try {
      await api.patch(`/bookings/${booking._id}/cancel`);
      onCancel(booking._id);
    } catch (err) {
      setCancelError(err.response?.data?.message || "Cancellation failed.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className={`booking-card${isCancelled ? " booking-card--cancelled" : ""}`}>
      <div className="booking-card__body">
        {/* Title */}
        {isDeleted ? (
          <span className="booking-card__title booking-card__title--deleted">
            Event no longer available
          </span>
        ) : (
          <Link to={`/events/${ev._id}`} className="booking-card__title">
            {ev.title}
          </Link>
        )}

        {/* Meta */}
        <div className="booking-card__meta">
          {!isDeleted && (
            <>
              <span className="booking-card__meta-item">📅 {formatDate(ev.date)}</span>
              <span className="booking-card__meta-item">📍 {ev.venue}</span>
            </>
          )}
          <span className="booking-card__meta-item">
            🪑 {booking.seats} seat{booking.seats !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Footer */}
        <div className="booking-card__footer">
          <span className={`status-badge status-badge--${booking.status}`}>
            {booking.status === "confirmed" ? "✓ Confirmed" : "✕ Cancelled"}
          </span>

          {canCancel && (
            <button
              className="booking-card__cancel-btn"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling…" : "Cancel booking"}
            </button>
          )}

          {cancelError && (
            <span style={{ fontSize: "0.8rem", color: "#fca5a5" }}>
              ⚠️ {cancelError}
            </span>
          )}

          {!isDeleted && price && (
            <span
              className={`booking-card__price${price.free ? " booking-card__price--free" : ""}`}
            >
              {price.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page component ────────────────────────────────────────────
export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    api
      .get("/bookings/mine", { signal: controller.signal })
      .then((res) => {
        setBookings(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setError(err.response?.data?.message || "Failed to load bookings. Please try again.");
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  // Mark a booking cancelled in local state (optimistic)
  function handleCancel(id) {
    setBookings((prev) =>
      prev.map((b) => (b._id === id ? { ...b, status: "cancelled" } : b))
    );
  }

  // ── States ────────────────────────────────────────────────
  return (
    <div className="my-bookings">
      <h1 className="my-bookings__title">My Bookings</h1>
      <p className="my-bookings__subtitle">Your upcoming and past event reservations</p>

      {loading && <SkeletonList count={4} />}

      {!loading && error && (
        <div className="my-bookings__state my-bookings__state--error">
          <span className="my-bookings__state-icon">⚠️</span>
          <p className="my-bookings__state-title">Something went wrong</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div className="my-bookings__state">
          <span className="my-bookings__state-icon">🎭</span>
          <p className="my-bookings__state-title">No bookings yet</p>
          <p>You haven&apos;t booked any events. Browse what&apos;s on!</p>
          <Link to="/" className="my-bookings__browse-link">
            🔍 Browse events
          </Link>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="my-bookings__list">
          {bookings.map((booking) => (
            <BookingCard
              key={booking._id}
              booking={booking}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
