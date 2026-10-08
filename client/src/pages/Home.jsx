import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./Home.css";

// ── Helpers ──────────────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(price) {
  if (price === 0) return { label: "Free", free: true };
  return {
    label: `₹${Number(price).toLocaleString("en-IN")}`,
    free: false,
  };
}

function SeatBadge({ available }) {
  if (available === 0)
    return <span className="badge badge--sold-out">Sold out</span>;
  if (available <= 10)
    return <span className="badge badge--low">Only {available} left</span>;
  return null;
}

// ── Skeleton cards shown while loading ───────────────────────
function SkeletonGrid({ count = 9 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line skeleton-line--medium" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      ))}
    </>
  );
}

// ── Event card ────────────────────────────────────────────────
function EventCard({ event }) {
  const { label: priceLabel, free } = formatPrice(event.price);
  return (
    <Link to={`/events/${event._id}`} className="event-card">
      <div className="event-card__badge-row">
        <SeatBadge available={event.availableSeats} />
      </div>
      <h2 className="event-card__title">{event.title}</h2>
      <div className="event-card__meta">
        <span className="event-card__meta-item">
          <span className="event-card__meta-icon">📅</span>
          {formatDate(event.date)}
        </span>
        <span className="event-card__meta-item">
          <span className="event-card__meta-icon">📍</span>
          {event.venue}
        </span>
        <span className="event-card__meta-item">
          <span className="event-card__meta-icon">🪑</span>
          {event.availableSeats} / {event.totalSeats} seats
        </span>
      </div>
      <div className="event-card__footer">
        <span className={`event-card__price${free ? " event-card__price--free" : ""}`}>
          {priceLabel}
        </span>
        <span className="event-card__cta">View details →</span>
      </div>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────
const LIMIT = 8;

export default function Home() {
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch]         = useState(""); // debounced
  const [page, setPage]             = useState(1);

  const [events, setEvents]         = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // Debounce: update `search` 400 ms after the user stops typing,
  // and reset to page 1 so the new query starts from the beginning.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(inputValue.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Fetch events — AbortController guards against stale responses.
  const fetchEvents = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    const params = { page, limit: LIMIT };
    if (search) params.search = search;

    api
      .get("/events", { params, signal: controller.signal })
      .then((res) => {
        setEvents(res.data.events);
        setPagination(res.data.pagination);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.name === "AbortError") return;
        setError(
          err.response?.data?.message || "Failed to load events. Please try again."
        );
        setLoading(false);
      });

    // Cleanup: abort the in-flight request when deps change or unmount.
    return () => controller.abort();
  }, [page, search]);

  useEffect(() => {
    return fetchEvents();
  }, [fetchEvents]);

  // ── Render ─────────────────────────────────────────────────
  const totalPages = pagination?.pages ?? 1;

  return (
    <div className="home">
      <div className="home__header">
        <h1 className="home__title">Upcoming Events</h1>
        <p className="home__subtitle">
          Discover and book the best events near you
        </p>
      </div>

      <div className="home__search-wrap">
        <span className="home__search-icon">🔍</span>
        <input
          className="home__search"
          type="search"
          placeholder="Search by title or venue…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="Search events"
        />
      </div>

      <div className="home__grid">
        {loading && <SkeletonGrid count={LIMIT} />}

        {!loading && error && (
          <div className="home__state home__state--error">
            <span className="home__state-icon">⚠️</span>
            <p className="home__state-title">Something went wrong</p>
            <p>{error}</p>
            <button
              className="home__pag-btn"
              style={{ marginTop: "0.5rem" }}
              onClick={fetchEvents}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="home__state">
            <span className="home__state-icon">🎭</span>
            <p className="home__state-title">
              {search ? `No results for "${search}"` : "No upcoming events"}
            </p>
            <p>Check back soon for new events.</p>
          </div>
        )}

        {!loading && !error && events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>

      {!loading && !error && totalPages > 1 && (
        <div className="home__pagination">
          <button
            className="home__pag-btn"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            ← Previous
          </button>
          <span className="home__pag-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="home__pag-btn"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
