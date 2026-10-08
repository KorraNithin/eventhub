// Usage (server running): node src/scripts/concurrencyTest.js
// Needs Node 18+ (built-in fetch). Admin creds can be set via env vars.
const BASE = process.env.API_URL || "http://localhost:5000/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin12345";
const USERS = 20;
const SEATS = 5;

async function call(path, method, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

(async () => {
  const run = Date.now();

  const admin = await call("/auth/login", "POST", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  if (admin.status !== 200) throw new Error("Admin login failed");

  const created = await call(
    "/events", "POST",
    { title: `Load test ${run}`, description: "concurrency test", venue: "Test Hall",
      date: "2027-06-01", price: 1, totalSeats: SEATS },
    admin.data.token
  );
  const eventId = created.data._id || (created.data.event && created.data.event._id);
  if (!eventId) throw new Error("Could not create event: " + JSON.stringify(created.data));

  const tokens = [];
  for (let i = 0; i < USERS; i++) {
    const r = await call("/auth/register", "POST", {
      name: `Load User ${i}`, email: `loadtest-${run}-${i}@example.com`, password: "secret123",
    });
    tokens.push(r.data.token);
  }

  console.log(`Firing ${USERS} simultaneous bookings for an event with ${SEATS} seats...`);
  const results = await Promise.all(
    tokens.map((t) => call("/bookings", "POST", { eventId, seats: 1 }, t))
  );

  const ok = results.filter((r) => r.status === 201).length;
  const soldOut = results.filter((r) => r.status === 409).length;
  const other = results.length - ok - soldOut;
  const ev = await call(`/events/${eventId}`, "GET");
  const available = (ev.data.event || ev.data).availableSeats;

  console.log({ booked: ok, rejectedSoldOut: soldOut, other, availableSeats: available });
  const pass = ok === SEATS && available === 0 && other === 0;
  console.log(pass ? "PASS: no overbooking" : "FAIL: seat count is wrong");
  process.exit(pass ? 0 : 1);
})();