# 🎬 Movie Ticket Booking System – REST API

A production-style backend where **customers** browse movies, view free seats and book tickets, and **cinema admins** manage movies, showtimes, prices and seat availability.

Built with **Node.js · TypeScript · Express · MongoDB (Mongoose) · JWT · bcrypt · Zod · Swagger**.

**Live API docs:** `https://movie-ticket-booking-system-production-4461.up.railway.app/api-docs`

---

## Features

- JWT authentication (register / login / me) with bcrypt password hashing
- Role-based access control: `customer` and `admin`
- Movies: full CRUD, soft delete, search by title, filter by genre / status / date, sorting, pagination
- Showtimes: full CRUD, future-only validation, hall-overlap protection, filter by movie / date / time
- Seat map per showtime, admin seat blocking / unblocking
- Bookings: create, history, cancel before start (seats are released automatically)
- Admin dashboard statistics
- Zod request validation, centralized error handling, request logging (morgan), helmet, CORS, rate limiting on auth
- Swagger UI documentation at `/api-docs`

## Project structure

```
src/
├── config/        env (validated with Zod), database connection, Swagger spec
├── models/        User, Movie, Showtime, Booking (Mongoose)
├── validators/    Zod schemas for bodies, params and query strings
├── middlewares/   auth guard + role guard, validation, error handling
├── controllers/   business logic
├── routes/        route definitions (one file per resource)
├── utils/         ApiError, asyncHandler, JWT helpers, date helpers, ...
├── app.ts         Express app (middleware + routes)
└── server.ts      bootstrap + graceful shutdown
scripts/
└── smoke-test.ts  end-to-end test of the whole API
```

## Getting started

Requirements: **Node.js 18+** and a **MongoDB** database (local or [MongoDB Atlas](https://www.mongodb.com/atlas)).

```bash
npm install
cp .env.example .env      # Windows: copy .env.example .env
# edit .env: MONGO_URI, JWT_SECRET, ADMIN_REGISTRATION_SECRET
npm run dev
```

Open <http://localhost:5000/api-docs>.

### Environment variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | – (required) |
| `JWT_SECRET` | Secret used to sign tokens (min 16 chars) | – (required) |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor | `12` |
| `ADMIN_REGISTRATION_SECRET` | Needed to register a Cinema Admin. Omit to disable admin sign-up | – |
| `CINEMA_TZ_OFFSET` | Cinema time zone offset, e.g. `+02:00` | `+02:00` |
| `CORS_ORIGIN` | `*` or comma-separated list of allowed origins | `*` |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with auto-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled app (production) |
| `npm run typecheck` | Type-check without emitting files |
| `npm run test:smoke` | Run the end-to-end API test (server must be running) |

## Roles

Public registration always creates a **customer**. To create a **cinema admin**, register with `"role": "admin"` and `"adminSecret": "<ADMIN_REGISTRATION_SECRET>"`.

## API overview

Base path: `/api` (protected routes need `Authorization: Bearer <token>`).

| Method | Endpoint | Access |
|---|---|---|
| POST | `/auth/register` · `/auth/login` | Public |
| GET | `/auth/me` | Logged in |
| GET | `/movies` · `/movies/:id` | Public |
| POST · PATCH · DELETE | `/movies` · `/movies/:id` | Admin |
| GET | `/showtimes` · `/showtimes/:id` · `/showtimes/:id/seats` | Public |
| POST · PATCH · DELETE | `/showtimes` · `/showtimes/:id` | Admin |
| PATCH | `/showtimes/:id/seats` (block / unblock seats) | Admin |
| POST | `/bookings` | Customer |
| GET | `/bookings/my` | Customer |
| PATCH | `/bookings/:id/cancel` | Customer (own booking) |
| GET | `/bookings/:id` | Owner or Admin |
| GET | `/bookings` | Admin |
| GET | `/admin/stats` | Admin |

### Search & filtering

- `GET /movies?search=incep&genre=sci-fi&status=now_showing&date=2026-10-05&sortBy=rating&order=desc&page=1&limit=10`
- `GET /showtimes?movieId=<id>&date=2026-10-05&timeFrom=18:00&timeTo=23:00&hallNumber=2`

## How the business rules are enforced

| Rule | Where / how |
|---|---|
| A seat can't be booked twice for the same showtime | Seats are reserved with **one atomic MongoDB update** (`$nin` + `$push`), so concurrent requests can't both win |
| No duplicate seats in one reservation | Zod validation |
| Bookings only for upcoming showtimes | Checked in the controller and again inside the atomic update |
| Cancel only before the movie starts | `cancelBooking` compares against `showtime.startsAt` |
| Cancelling releases the seats | `$pull` on the showtime's `bookedSeats` |
| Showtime with confirmed bookings can't be deleted | `deleteShowtime` checks bookings first (409) |
| Booked seats never exceed capacity | Seat numbers must be unique and inside `1..totalCapacity` |
| Only admins manage movies / showtimes | `protect` + `restrictTo('admin')` |
| Customers manage only their own bookings | Ownership check on read / cancel |
| Future showtimes only | Validated on create and update |

## Deployment (Railway)

1. Push the repository to GitHub.
2. Create a Railway project from the repo and add a MongoDB (Railway plugin or Atlas).
3. Set the variables: `MONGO_URI`, `JWT_SECRET`, `ADMIN_REGISTRATION_SECRET`, `NODE_ENV=production`, `CINEMA_TZ_OFFSET`.
4. Build command: `npm run build` · Start command: `npm start`. Railway provides `PORT` automatically.

## License

MIT
