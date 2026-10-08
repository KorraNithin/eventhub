# EventHub

A MERN event booking app. Admins create events; users browse, search and book seats.
Seat booking is atomic, so concurrent requests can never oversell an event.

## Features
- Register/login with JWT and bcrypt; roles `user` and `admin`
- Admin: create, edit, delete events (with validation rules, e.g. seats can't drop below the booked count)
- Users: search and paginate events, book 1-4 seats, view and cancel bookings
- Atomic seat reservation (single conditional `findOneAndUpdate`) and atomic cancellation
- One active booking per user per event (partial unique index)
- Protected routes on both client and server (server is the real enforcement)

## Tech stack
MongoDB Atlas, Express, React (Vite), Node.js, Mongoose, JWT, bcryptjs, axios, React Router

## Project structure
```
server/  src/{config,models,controllers,routes,middleware,scripts}
client/  src/{api,context,components,pages}
```

## Setup
Requirements: Node 18+, a MongoDB Atlas (or local MongoDB) connection string.

1. Clone the repo
2. Server:
```
   cd server
   npm install
   cp .env.example .env   (Windows: copy .env.example .env)
```
   Fill in `MONGO_URI` and a long random `JWT_SECRET`:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
3. Client:
```
   cd client
   npm install
   cp .env.example .env
```

## Run
```
cd server && npm run dev     # http://localhost:5000
cd client && npm run dev     # http://localhost:5173
```

## Creating an admin
Registration always creates a normal user (no way to self-promote). Register, then run:
```
cd server
node src/scripts/makeAdmin.js you@example.com
```

## Concurrency test
`node src/scripts/concurrencyTest.js` (server running) registers 20 users and fires 20
simultaneous bookings at an event with 5 seats. Result:
```
{ booked: 5, rejectedSoldOut: 15, other: 0, availableSeats: 0 }
PASS: no overbooking
```

## API overview
| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | public |
| GET | /api/auth/me | user |
| GET | /api/events, /api/events/:id | public |
| POST/PUT/DELETE | /api/events, /api/events/:id | admin |
| POST | /api/bookings | user |
| GET | /api/bookings/mine | user |
| PATCH | /api/bookings/:id/cancel | user |

## AI development
**Tool used: Kiro.** I first installed Code0, but every prompt failed with
"Invalid API key" and login didn't fix it, so I switched to Kiro (allowed by the task).

I used Kiro for: (1) User model and auth controller, (2) JWT protect/authorize middleware,
(3) event CRUD with search and pagination, (4) booking and cancellation logic,
(5) React auth context, routing, event pages, booking flow and admin UI.

**Issues in AI output that I found and fixed:**
- `pre('save')` hook used `next()` in an async function, which crashed on Mongoose 9
  ("next is not a function"). Removed the callback.
- Cancellation read, checked and then wrote, so double-clicking cancel could restore seats
  twice. Changed to an atomic `findOneAndUpdate` on `status: "confirmed"`.
- Seats validation used `Number(seats)`, so `"2"` was accepted. Now requires an integer.
- Reducing `totalSeats` floored available seats at 0, which could create more booked seats
  than seats existing. Now rejected with a 400. Deleting events with active bookings returns 409.
- Duplicate-key and validation errors returned 500. Mapped to 409/400 in the error handler.
- A decorative background layer covered page content on some routes (stacking order). Fixed with z-index.

**What I did myself:**
- Chose the project idea (event booking) because it has a real concurrency problem to solve, and designed the data models (User, Event, Booking) and the role-based access rules.
- Set up the repo, the client/server structure and MongoDB Atlas, and kept secrets out of Git (`.env` ignored, placeholder-only `.env.example` files).
- Diagnosed the Code0 "Invalid API key" failure, tried the login and reload fixes, and switched to Kiro.
- Wrote the prompts for each feature and reviewed the generated code before approving it, checking password hashing, role handling, token expiry, error messages and response shapes.
- Ran manual API tests in PowerShell for every endpoint, including negative tests: a fake token, a client-supplied `role: "admin"`, past dates, invalid ids and regex characters in search.
- Found the `next is not a function` crash from the error message, traced it to the Mongoose 9 pre-save hook, and fixed it.
- Replaced the placeholder JWT secret with a randomly generated one.
- Created the `makeAdmin.js` script so admins can only be created from the server side, never through the API.
- Wrote and ran the concurrency test (20 simultaneous bookings for 5 seats) to verify there is no overbooking.
- Reviewed the cancel flow and seat validation for race conditions and loose input checks, and applied the fixes.
- Tested the full UI flow as guest, user and admin: login persistence, protected routes, booking, double booking, cancel and rebook, and admin create, edit and delete.
- Debugged the invisible-content bug in browser DevTools, found it was a stacking-order problem with the background layer, and fixed it.
- Customised the UI theme and CSS.
- Committed in small steps as each feature was finished, with separate `fix:` commits for the bugs I found.

## Known trade-offs
- Token stored in localStorage (XSS tradeoff; httpOnly cookies would need CSRF handling)
- Booking doesn't store the price paid, so totals use the current event price
- Admin event edits are read-then-write; fine for low traffic