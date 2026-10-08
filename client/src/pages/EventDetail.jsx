import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./EventDetail.css";
import "./Home.css"; // reuse .badge classes

// ── Helpers ──────────────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatPrice(price) {
  if (price === 0) return "Free";
  return `₹${Number(price).toLocaleString("en-IN")}`;
}

function SeatBadge({ available }) {
  if (available === 0) return <span className="badge badge--sold-out">Sold out</span>;
  if (available <= 10) return <span className="badge badge--low">Only {available} left</span>;
  return null;
}

// ── Skeleton ─────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="event-detail__skeleton">
      <div className="sk sk--title" />
      <div className="sk sk--medium" />
      <div className="sk sk--full" style={{ height: "100px" }} />
      <div className="sk sk--short" />
      <div className="sk sk--medium" />
    </div>
  );
}

// ── Booking panel ─────────────────────────────────────────────
function BookingPanel({ event, onBooked }) {
  const { user } = useAuth();
  const [seats, setSeats]         = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [bookError, setBookError] = useState("");
  const [booked, setBooked]       = useState(null); // booking doc on success

  const isFree   = event.price === 0;
  const isSoldOut = event.availableSeats === 0;
  const isPast   = new Date(event.date) <= new Date();
  const maxSeats = Math.min(4, event.availableSeats);

  const totalPrice = isFree ? "Free" : `₹${Number(event.price * seats).toLocaleString("en-IN")}`;

  // ── Logged-out state ────────────────────────────────────────
  if (!user) {
    return (
      <div className="event-detail__book">
        <h3 className="event-detail__book-title">Reserve your spot</h3>
        <p className="event-detail__book-sub">Sign in to book tickets for this event.</p>
        <Link to="/login" className="event-detail__login-prompt">
          🔐 Log in to book
        </Link>
      </div>
    );
  }

  // ── Already booked (success state) ─────────────────────────
  if (booked) {
    return (
      <div className="event-detail__book">
        <div className="event-detail__book-success">
          <p className="event-detail__book-success-msg">
            ✅ Booking confirmed! {booked.seats} seat{booked.seats !== 1 ? "s" : ""} reserved.
          </p>
          <Link to="/bookings" className="event-detail__book-success-link">
            📋 View my bookings →
          </Link>
        </div>
      </div>
    );
  }

  // ── Unavailable states ──────────────────────────────────────
  if (isSoldOut || isPast) {
    return (
      <div className="event-detail__book">
        <h3 className="event-detail__book-title">Reserve your spot</h3>
        <p className="event-detail__book-sub">
          {isSoldOut ? "This event is fully booked." : "This event has already taken place."}
        </p>
        <button className="event-detail__book-btn" disabled>
          🎟️ {isSoldOut ? "Sold out" : "Event ended"}
        </button>
      </div>
    );
  }

  // ── Active booking form ─────────────────────────────────────
  async function handleConfirm() {
    setBookError("");
    setSubmitting(true);
    try {
      const res = await api.post("/bookings", { eventId: event._id, seats });
      // res.data is the booking doc; event.availableSeats is updated from populated event
      const newAvailable = res.data.event?.availableSeats ?? (event.availableSeats - seats);
      onBooked(newAvailable);
      setBooked(res.data);
    } catch (err) {
      setBookError(
        err.response?.data?.message || "Booking failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="event-detail__book">
      <h3 className="event-detail__book-title">Reserve your spot</h3>
      <p className="event-detail__book-sub">
        {event.availableSeats} seat{event.availableSeats !== 1 ? "s" : ""} remaining
      </p>

      {bookError && (
        <p className="event-detail__book-error" role="alert">
          ⚠️ {bookError}
        </p>
      )}

      <div className="event-detail__seats-row">
        <span className="event-detail__seats-label">Seats</span>
        <div className="event-detail__seats-control">
          <button
            className="event-detail__seats-btn"
            onClick={() => setSeats((s) => s - 1)}
            disabled={seats <= 1}
            aria-label="Decrease seats"
          >
            −
          </button>
          <span className="event-detail__seats-count">{seats}</span>
          <button
            className="event-detail__seats-btn"
            onClick={() => setSeats((s) => s + 1)}
            disabled={seats >= maxSeats}
            aria-label="Increase seats"
          >
            +
          </button>
        </div>
        <span className="event-detail__total">
          Total: <strong>{totalPrice}</strong>
        </span>
      </div>

      <button
        className="event-detail__book-btn"
        onClick={handleConfirm}
        disabled={submitting}
      >
        {submitting ? (
          <><span className="book-spinner" /> Confirming…</>
        ) : (
          <>🎟️ Confirm booking</>
        )}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function EventDetail() {
  const { id } = useParams();

  const [event, setEvent]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setNotFound(false);

    api
      .get(`/events/${id}`, { signal: controller.signal })
      .then((res) => {
        setEvent(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        if (err.response?.status === 404 || err.response?.status === 400) {
          setNotFound(true);
        } else {
          setError(err.response?.data?.message || "Failed to load event. Please try again.");
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  // Update displayed availableSeats after a successful booking
  function handleBooked(newAvailable) {
    setEvent((prev) => ({ ...prev, availableSeats: newAvailable }));
  }

  // ── States ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="event-detail">
        <Link to="/" className="event-detail__back">← Back to events</Link>
        <Skeleton />
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="event-detail">
        <Link to="/" className="event-detail__back">← Back to events</Link>
        <div className="event-detail__state">
          <span className="event-detail__state-icon">🔍</span>
          <p className="event-detail__state-title">Event not found</p>
          <p>This event may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="event-detail">
        <Link to="/" className="event-detail__back">← Back to events</Link>
        <div className="event-detail__state event-detail__state--error">
          <span className="event-detail__state-icon">⚠️</span>
          <p className="event-detail__state-title">Something went wrong</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const isFree    = event.price === 0;
  const isSoldOut = event.availableSeats === 0;
  const isPast    = new Date(event.date) <= new Date();

  return (
    <div className="event-detail">
      <Link to="/" className="event-detail__back">← Back to events</Link>

      <div className="event-detail__header">
        <div className="event-detail__badge-row">
          <SeatBadge available={event.availableSeats} />
          {isPast && <span className="badge badge--sold-out">Past event</span>}
        </div>
        <h1 className="event-detail__title">{event.title}</h1>
      </div>

      <div className="event-detail__meta">
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label">Date</span>
          <span className="event-detail__meta-value">{formatDate(event.date)}</span>
        </div>
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label">Time</span>
          <span className="event-detail__meta-value">{formatTime(event.date)}</span>
        </div>
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label">Venue</span>
          <span className="event-detail__meta-value">{event.venue}</span>
        </div>
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label">Price</span>
          <span className={`event-detail__meta-value${isFree ? " event-detail__meta-value--free" : " event-detail__meta-value--price"}`}>
            {formatPrice(event.price)}
          </span>
        </div>
        <div className="event-detail__meta-item">
          <span className="event-detail__meta-label">Available seats</span>
          <span className={`event-detail__meta-value${isSoldOut ? " event-detail__meta-value--sold" : ""}`}>
            {isSoldOut ? "Sold out" : `${event.availableSeats} / ${event.totalSeats}`}
          </span>
        </div>
        {event.createdBy?.name && (
          <div className="event-detail__meta-item">
            <span className="event-detail__meta-label">Organiser</span>
            <span className="event-detail__meta-value">{event.createdBy.name}</span>
          </div>
        )}
      </div>

      {event.description && (
        <>
          <h3 className="event-detail__desc-heading">About this event</h3>
          <p className="event-detail__description">{event.description}</p>
        </>
      )}

      <div className="event-detail__divider" />

      <BookingPanel event={event} onBooked={handleBooked} />
    </div>
  );
}
