import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import "./AdminEvents.css";

// ── Date helpers ─────────────────────────────────────────────
function formatDisplayDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Convert ISO string → "YYYY-MM-DDTHH:mm" using LOCAL clock (avoids UTC offset shift)
function isoToLocalDatetimeInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

// ── Client-side validation ────────────────────────────────────
function validate(form, isCreate) {
  const errs = {};
  if (!form.title.trim() || form.title.trim().length < 3)
    errs.title = "Title must be at least 3 characters";
  else if (form.title.trim().length > 100)
    errs.title = "Title cannot exceed 100 characters";

  if (!form.description.trim())
    errs.description = "Description is required";
  else if (form.description.trim().length > 2000)
    errs.description = "Description cannot exceed 2000 characters";

  if (!form.venue.trim())
    errs.venue = "Venue is required";
  else if (form.venue.trim().length > 200)
    errs.venue = "Venue cannot exceed 200 characters";

  if (!form.date)
    errs.date = "Date is required";
  else if (isNaN(new Date(form.date).getTime()))
    errs.date = "Must be a valid date";
  else if (isCreate && new Date(form.date) <= new Date())
    errs.date = "Date must be in the future";

  const price = Number(form.price);
  if (form.price === "" || isNaN(price) || price < 0)
    errs.price = "Price must be a number ≥ 0";

  const seats = Number(form.totalSeats);
  if (form.totalSeats === "" || isNaN(seats) || !Number.isInteger(seats) || seats < 1)
    errs.totalSeats = "Total seats must be an integer ≥ 1";

  return errs;
}

// ── Empty form state ─────────────────────────────────────────
const EMPTY_FORM = {
  title: "", description: "", venue: "",
  date: "", price: "", totalSeats: "",
};

// ── Event form modal ──────────────────────────────────────────
function EventFormModal({ initial, onClose, onSaved }) {
  const isCreate = !initial;
  const [form, setForm]           = useState(
    initial
      ? {
          title:       initial.title,
          description: initial.description,
          venue:       initial.venue,
          date:        isoToLocalDatetimeInput(initial.date),
          price:       String(initial.price),
          totalSeats:  String(initial.totalSeats),
        }
      : EMPTY_FORM
  );
  const [fieldErrs, setFieldErrs] = useState({});
  const [serverErr, setServerErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrs((prev) => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form, isCreate);
    if (Object.keys(errs).length) { setFieldErrs(errs); return; }

    setServerErr("");
    setSubmitting(true);
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim(),
        venue:       form.venue.trim(),
        date:        new Date(form.date).toISOString(),
        price:       Number(form.price),
        totalSeats:  Number(form.totalSeats),
      };

      if (isCreate) {
        await api.post("/events", payload);
      } else {
        await api.put(`/events/${initial._id}`, payload);
      }
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors?.length) {
        setServerErr(data.errors.join(" · "));
      } else {
        setServerErr(data?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="ae-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ae-modal" role="dialog" aria-modal="true">
        <div className="ae-modal__header">
          <h2 className="ae-modal__title">
            {isCreate ? "➕ New Event" : "✏️ Edit Event"}
          </h2>
          <button className="ae-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="ae-form" onSubmit={handleSubmit} noValidate>
          {serverErr && (
            <p className="ae-form__server-error" role="alert">⚠️ {serverErr}</p>
          )}

          <div className={`ae-field${fieldErrs.title ? " ae-field--error" : ""}`}>
            <label htmlFor="ae-title">Title</label>
            <input
              id="ae-title" name="title" type="text"
              placeholder="Event title" value={form.title} onChange={handleChange}
            />
            {fieldErrs.title && <p className="ae-field__err">{fieldErrs.title}</p>}
          </div>

          <div className={`ae-field${fieldErrs.description ? " ae-field--error" : ""}`}>
            <label htmlFor="ae-desc">Description</label>
            <textarea
              id="ae-desc" name="description"
              placeholder="What's this event about?" value={form.description} onChange={handleChange}
            />
            {fieldErrs.description && <p className="ae-field__err">{fieldErrs.description}</p>}
          </div>

          <div className={`ae-field${fieldErrs.venue ? " ae-field--error" : ""}`}>
            <label htmlFor="ae-venue">Venue</label>
            <input
              id="ae-venue" name="venue" type="text"
              placeholder="Location or online link" value={form.venue} onChange={handleChange}
            />
            {fieldErrs.venue && <p className="ae-field__err">{fieldErrs.venue}</p>}
          </div>

          <div className={`ae-field${fieldErrs.date ? " ae-field--error" : ""}`}>
            <label htmlFor="ae-date">Date &amp; Time</label>
            <input
              id="ae-date" name="date" type="datetime-local"
              value={form.date} onChange={handleChange}
            />
            {fieldErrs.date && <p className="ae-field__err">{fieldErrs.date}</p>}
          </div>

          <div className="ae-form__row">
            <div className={`ae-field${fieldErrs.price ? " ae-field--error" : ""}`}>
              <label htmlFor="ae-price">Price (₹)</label>
              <input
                id="ae-price" name="price" type="number"
                min="0" step="0.01" placeholder="0 = Free"
                value={form.price} onChange={handleChange}
              />
              {fieldErrs.price && <p className="ae-field__err">{fieldErrs.price}</p>}
            </div>

            <div className={`ae-field${fieldErrs.totalSeats ? " ae-field--error" : ""}`}>
              <label htmlFor="ae-seats">Total Seats</label>
              <input
                id="ae-seats" name="totalSeats" type="number"
                min="1" step="1" placeholder="e.g. 200"
                value={form.totalSeats} onChange={handleChange}
              />
              {fieldErrs.totalSeats && <p className="ae-field__err">{fieldErrs.totalSeats}</p>}
            </div>
          </div>

          <div className="ae-form__actions">
            <button type="button" className="ae-form__cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ae-form__submit-btn" disabled={submitting}>
              {submitting && <span className="ae-spinner" />}
              {submitting ? "Saving…" : isCreate ? "Create event" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────
function SkeletonRows({ count = 6 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr className="ae-sk-row" key={i}>
      {[200, 120, 110, 70, 90, 80].map((w, j) => (
        <td key={j}><div className="ae-sk" style={{ width: w }} /></td>
      ))}
    </tr>
  ));
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminEvents() {
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState("");
  const [modal, setModal]       = useState(null); // null | "new" | event-object (edit)
  const [deleting, setDeleting] = useState(null); // id being deleted
  const [deleteErr, setDeleteErr] = useState(""); // per-row delete error

  const fetchEvents = useCallback(() => {
    setLoading(true);
    setLoadErr("");
    api
      .get("/events", { params: { upcoming: "false", limit: 100 } })
      .then((res) => {
        setEvents(res.data.events);
        setLoading(false);
      })
      .catch((err) => {
        setLoadErr(err.response?.data?.message || "Failed to load events.");
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function handleSaved() {
    setModal(null);
    fetchEvents();
  }

  async function handleDelete(event) {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    setDeleting(event._id);
    setDeleteErr("");
    try {
      await api.delete(`/events/${event._id}`);
      fetchEvents();
    } catch (err) {
      setDeleteErr(err.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="admin-events">
      <div className="admin-events__header">
        <div>
          <h1 className="admin-events__title">Manage Events</h1>
          <p className="admin-events__subtitle">
            {!loading && !loadErr ? `${events.length} event${events.length !== 1 ? "s" : ""}` : "All events"}
          </p>
        </div>
        <button className="admin-events__new-btn" onClick={() => setModal("new")}>
          ➕ New event
        </button>
      </div>

      {/* Global delete error banner */}
      {deleteErr && (
        <p className="ae-form__server-error" role="alert" style={{ marginBottom: "1rem" }}>
          ⚠️ {deleteErr}
          <button
            onClick={() => setDeleteErr("")}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: "1rem" }}
          >✕</button>
        </p>
      )}

      {/* Error state */}
      {!loading && loadErr && (
        <div className="admin-events__state admin-events__state--error">
          <span className="admin-events__state-icon">⚠️</span>
          <p className="admin-events__state-title">Failed to load events</p>
          <p>{loadErr}</p>
          <button className="ae-btn ae-btn--edit" style={{ marginTop: "0.5rem" }} onClick={fetchEvents}>
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadErr && events.length === 0 && (
        <div className="admin-events__state">
          <span className="admin-events__state-icon">🎭</span>
          <p className="admin-events__state-title">No events yet</p>
          <p>Create your first event to get started.</p>
        </div>
      )}

      {/* Table */}
      {(!loading || events.length > 0) && !loadErr && (
        <div className="admin-events__table-wrap">
          <table className="admin-events__table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Venue</th>
                <th>Date</th>
                <th>Price</th>
                <th>Seats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows count={6} />
              ) : (
                events.map((ev) => {
                  const isPast   = new Date(ev.date) <= new Date();
                  const isFree   = ev.price === 0;
                  const booked   = ev.totalSeats - ev.availableSeats;
                  const lowSeats = ev.availableSeats > 0 && ev.availableSeats <= 10;
                  const soldOut  = ev.availableSeats === 0;
                  const isDeleting = deleting === ev._id;

                  return (
                    <tr key={ev._id}>
                      <td>
                        <span className="ae-title-cell" title={ev.title}>{ev.title}</span>
                        {isPast && <span className="ae-past"> · Past</span>}
                      </td>
                      <td>{ev.venue}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDisplayDate(ev.date)}</td>
                      <td className={isFree ? "ae-price-free" : ""}>
                        {isFree ? "Free" : `₹${Number(ev.price).toLocaleString("en-IN")}`}
                      </td>
                      <td
                        className={soldOut ? "ae-seats-sold" : lowSeats ? "ae-seats-low" : ""}
                      >
                        {booked} / {ev.totalSeats}
                        {soldOut && " · Sold out"}
                      </td>
                      <td>
                        <div className="ae-actions">
                          <button
                            className="ae-btn ae-btn--edit"
                            onClick={() => setModal(ev)}
                            disabled={isDeleting}
                          >
                            Edit
                          </button>
                          <button
                            className="ae-btn ae-btn--delete"
                            onClick={() => handleDelete(ev)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <EventFormModal
          initial={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
