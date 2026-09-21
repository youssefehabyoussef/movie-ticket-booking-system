/**
 * End-to-end smoke test for the running API.
 *
 *   npm run dev            (in one terminal)
 *   npm run test:smoke     (in another one)
 *
 * Test a deployed server:
 *   BASE_URL=https://your-app.up.railway.app ADMIN_SECRET=your-admin-secret npm run test:smoke
 *
 * It creates throw-away users, one movie and one showtime with random data.
 * Use a development database, not production data.
 */
import 'dotenv/config';

/* eslint-disable @typescript-eslint/no-explicit-any */
const BASE = (process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 5000}`).replace(/\/$/, '');
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? process.env.ADMIN_REGISTRATION_SECRET;
const PASSWORD = 'Passw0rd!123';

let passed = 0;
let failed = 0;

const check = (name: string, condition: boolean, details?: unknown) => {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`, details !== undefined ? JSON.stringify(details) : '');
  }
};

const section = (title: string) => console.log(`\n▶ ${title}`);

async function call(method: string, path: string, options: { token?: string; body?: unknown } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: any = {};
  try {
    data = await response.json();
  } catch {
    /* empty body */
  }
  return { status: response.status, data };
}

async function main() {
  console.log(`Testing ${BASE}`);
  if (!ADMIN_SECRET) {
    console.error('\nADMIN_SECRET (or ADMIN_REGISTRATION_SECRET in .env) is required to create an admin account.');
    process.exit(1);
  }

  const stamp = Date.now();
  const adminEmail = `admin.${stamp}@test.dev`;
  const aliceEmail = `alice.${stamp}@test.dev`;
  const bobEmail = `bob.${stamp}@test.dev`;

  section('Health');
  check('GET /health returns 200', (await call('GET', '/health')).status === 200);

  section('Authentication');
  const weak = await call('POST', '/api/auth/register', { body: { fullName: 'Weak', email: `weak.${stamp}@test.dev`, password: '12345' } });
  check('weak password is rejected (400)', weak.status === 400, weak.data);

  const wrongSecret = await call('POST', '/api/auth/register', {
    body: { fullName: 'Fake Admin', email: `fake.${stamp}@test.dev`, password: PASSWORD, role: 'admin', adminSecret: 'wrong-secret-value' },
  });
  check('admin registration with a wrong secret is rejected (403)', wrongSecret.status === 403, wrongSecret.data);

  const adminReg = await call('POST', '/api/auth/register', {
    body: { fullName: 'Test Admin', email: adminEmail, password: PASSWORD, role: 'admin', adminSecret: ADMIN_SECRET },
  });
  check('admin registers (201)', adminReg.status === 201 && adminReg.data.data?.user?.role === 'admin', adminReg.data);
  check('password is never returned', adminReg.data.data?.user?.password === undefined);

  const dup = await call('POST', '/api/auth/register', {
    body: { fullName: 'Test Admin', email: adminEmail, password: PASSWORD, role: 'admin', adminSecret: ADMIN_SECRET },
  });
  check('duplicate email is rejected (409)', dup.status === 409, dup.data);

  const alice = await call('POST', '/api/auth/register', { body: { fullName: 'Alice', email: aliceEmail, password: PASSWORD } });
  const bob = await call('POST', '/api/auth/register', { body: { fullName: 'Bob', email: bobEmail, password: PASSWORD } });
  check('customers register (201)', alice.status === 201 && bob.status === 201);

  const login = await call('POST', '/api/auth/login', { body: { email: aliceEmail, password: PASSWORD } });
  check('login returns a token (200)', login.status === 200 && typeof login.data.data?.token === 'string');
  check('wrong password is rejected (401)', (await call('POST', '/api/auth/login', { body: { email: aliceEmail, password: 'Wrong123!' } })).status === 401);

  const adminToken: string = adminReg.data.data?.token;
  const aliceToken: string = login.data.data?.token;
  const bobToken: string = bob.data.data?.token;

  check('GET /auth/me works with a token', (await call('GET', '/api/auth/me', { token: aliceToken })).status === 200);
  check('protected route without token (401)', (await call('GET', '/api/auth/me')).status === 401);

  section('Movies');
  const movieBody = {
    title: `Smoke Test Movie ${stamp}`,
    genre: 'Sci-Fi',
    duration: 120,
    description: 'Created by the smoke test',
    posterUrl: 'https://example.com/poster.jpg',
    rating: 8.1,
    status: 'now_showing',
  };
  check('customer cannot create a movie (403)', (await call('POST', '/api/movies', { token: aliceToken, body: movieBody })).status === 403);
  check('anonymous cannot create a movie (401)', (await call('POST', '/api/movies', { body: movieBody })).status === 401);
  check('invalid movie is rejected (400)', (await call('POST', '/api/movies', { token: adminToken, body: { title: 'x' } })).status === 400);

  const movie = await call('POST', '/api/movies', { token: adminToken, body: movieBody });
  check('admin creates a movie (201)', movie.status === 201, movie.data);
  const movieId: string = movie.data.data?.id;

  const search = await call('GET', `/api/movies?search=${encodeURIComponent(`Smoke Test Movie ${stamp}`)}&genre=sci-fi&status=now_showing`);
  check('search + filter finds the movie', search.status === 200 && search.data.data?.some((m: any) => m.id === movieId), search.data);

  const patch = await call('PATCH', `/api/movies/${movieId}`, { token: adminToken, body: { rating: 9 } });
  check('admin updates the movie', patch.status === 200 && patch.data.data?.rating === 9, patch.data);

  section('Showtimes');
  const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const hallNumber = Math.floor(Math.random() * 1_000_000) + 1;
  const showtimeBody = { movie: movieId, hallNumber, date, startTime: '20:00', endTime: '22:30', ticketPrice: 100, totalCapacity: 50 };

  check('showtime in the past is rejected (400)', (await call('POST', '/api/showtimes', { token: adminToken, body: { ...showtimeBody, date: '2020-01-01' } })).status === 400);

  const showtime = await call('POST', '/api/showtimes', { token: adminToken, body: showtimeBody });
  check('admin creates a showtime (201)', showtime.status === 201, showtime.data);
  const showtimeId: string = showtime.data.data?.id;

  const overlap = await call('POST', '/api/showtimes', { token: adminToken, body: { ...showtimeBody, startTime: '21:00', endTime: '23:00' } });
  check('overlapping show in the same hall is rejected (409)', overlap.status === 409, overlap.data);

  const seatsBefore = await call('GET', `/api/showtimes/${showtimeId}/seats`);
  check('all 50 seats are available', seatsBefore.data.data?.availableSeats?.length === 50, seatsBefore.data);

  const dayList = await call('GET', `/api/showtimes?movieId=${movieId}&date=${date}&timeFrom=19:00&timeTo=21:00`);
  check('showtime filter (movie + date + time) works', dayList.data.data?.length === 1, dayList.data);

  section('Bookings & business rules');
  const first = await call('POST', '/api/bookings', { token: aliceToken, body: { showtimeId, seats: [1, 2] } });
  check('Alice books seats 1,2 (201)', first.status === 201, first.data);
  check('total price = price x seats (200)', first.data.data?.totalPrice === 200, first.data.data);
  const aliceBookingId: string = first.data.data?.id;

  const clash = await call('POST', '/api/bookings', { token: bobToken, body: { showtimeId, seats: [2, 3] } });
  check('Bob cannot take seat 2 again (409)', clash.status === 409, clash.data);
  const seatsMid = await call('GET', `/api/showtimes/${showtimeId}/seats`);
  check('Bob did not get seat 3 either (all-or-nothing)', seatsMid.data.data?.availableSeats?.includes(3) === true);

  check('duplicate seats in one reservation are rejected (400)', (await call('POST', '/api/bookings', { token: aliceToken, body: { showtimeId, seats: [5, 5] } })).status === 400);
  check('seat number above capacity is rejected (400)', (await call('POST', '/api/bookings', { token: aliceToken, body: { showtimeId, seats: [51] } })).status === 400);
  check('admin cannot book tickets (403)', (await call('POST', '/api/bookings', { token: adminToken, body: { showtimeId, seats: [10] } })).status === 403);

  const race = await Promise.all([
    call('POST', '/api/bookings', { token: aliceToken, body: { showtimeId, seats: [20] } }),
    call('POST', '/api/bookings', { token: bobToken, body: { showtimeId, seats: [20] } }),
  ]);
  const raceStatuses = race.map((r) => r.status).sort();
  check('two simultaneous requests for seat 20: exactly one wins', raceStatuses[0] === 201 && raceStatuses[1] === 409, raceStatuses);

  check("Bob cannot cancel Alice's booking (403)", (await call('PATCH', `/api/bookings/${aliceBookingId}/cancel`, { token: bobToken })).status === 403);
  check("Bob cannot read Alice's booking (403)", (await call('GET', `/api/bookings/${aliceBookingId}`, { token: bobToken })).status === 403);

  const history = await call('GET', '/api/bookings/my', { token: aliceToken });
  check('Alice sees her booking history', history.status === 200 && history.data.data?.length >= 1, history.data);

  const allBookings = await call('GET', '/api/bookings', { token: adminToken });
  check('admin lists all bookings', allBookings.status === 200 && allBookings.data.meta?.total >= 2, allBookings.data);
  check('customer cannot list all bookings (403)', (await call('GET', '/api/bookings', { token: aliceToken })).status === 403);

  check('showtime with confirmed bookings cannot be deleted (409)', (await call('DELETE', `/api/showtimes/${showtimeId}`, { token: adminToken })).status === 409);
  check('movie with upcoming showtimes cannot be deleted (409)', (await call('DELETE', `/api/movies/${movieId}`, { token: adminToken })).status === 409);

  section('Cancellation releases seats');
  const cancel = await call('PATCH', `/api/bookings/${aliceBookingId}/cancel`, { token: aliceToken });
  check('Alice cancels her booking (200)', cancel.status === 200 && cancel.data.data?.status === 'cancelled', cancel.data);
  const seatsAfter = await call('GET', `/api/showtimes/${showtimeId}/seats`);
  check('seats 1 and 2 are available again', [1, 2].every((s) => seatsAfter.data.data?.availableSeats?.includes(s)), seatsAfter.data);
  check('cancelling twice is rejected (409)', (await call('PATCH', `/api/bookings/${aliceBookingId}/cancel`, { token: aliceToken })).status === 409);
  check('Bob can now book seat 2 (201)', (await call('POST', '/api/bookings', { token: bobToken, body: { showtimeId, seats: [2] } })).status === 201);

  section('Admin seat management');
  const block = await call('PATCH', `/api/showtimes/${showtimeId}/seats`, { token: adminToken, body: { action: 'block', seats: [30, 31] } });
  check('admin blocks seats 30,31 (200)', block.status === 200, block.data);
  check('customer cannot book a blocked seat (409)', (await call('POST', '/api/bookings', { token: aliceToken, body: { showtimeId, seats: [30] } })).status === 409);
  check('admin cannot block an already booked seat (409)', (await call('PATCH', `/api/showtimes/${showtimeId}/seats`, { token: adminToken, body: { action: 'block', seats: [2] } })).status === 409);
  check('admin unblocks the seats (200)', (await call('PATCH', `/api/showtimes/${showtimeId}/seats`, { token: adminToken, body: { action: 'unblock', seats: [30, 31] } })).status === 200);

  const price = await call('PATCH', `/api/showtimes/${showtimeId}`, { token: adminToken, body: { ticketPrice: 150 } });
  check('admin updates the ticket price', price.status === 200 && price.data.data?.ticketPrice === 150, price.data);

  section('Dashboard');
  const stats = await call('GET', '/api/admin/stats', { token: adminToken });
  check('admin stats (200)', stats.status === 200 && stats.data.data?.bookings?.confirmed >= 1, stats.data);
  check('customer cannot read stats (403)', (await call('GET', '/api/admin/stats', { token: aliceToken })).status === 403);

  console.log(`\n${failed === 0 ? '🎉' : '💥'} ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('\nCould not run the smoke test. Is the server running?', error);
  process.exit(1);
});
