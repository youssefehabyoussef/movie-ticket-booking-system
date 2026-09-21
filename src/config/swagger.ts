/**
 * OpenAPI 3 description of the API, served by Swagger UI at /api-docs.
 * Written as a plain object (instead of JSDoc comments) so it works the same
 * from `src/` in development and from `dist/` in production.
 */
type Obj = Record<string, unknown>;

// ------------------------------------------------------------------ helpers
const ref = (name: string): Obj => ({ $ref: `#/components/schemas/${name}` });

const errorNames = { 400: 'BadRequest', 401: 'Unauthorized', 403: 'Forbidden', 404: 'NotFound', 409: 'Conflict' } as const;
type ErrorCode = keyof typeof errorNames;
const errors = (...codes: ErrorCode[]): Obj =>
  Object.fromEntries(codes.map((code) => [String(code), { $ref: `#/components/responses/${errorNames[code]}` }]));

const jsonBody = (schema: string): Obj => ({
  required: true,
  content: { 'application/json': { schema: ref(schema) } },
});

const ok = (description: string, data: Obj): Obj => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: { success: { type: 'boolean', example: true }, message: { type: 'string' }, data },
      },
    },
  },
});

const okList = (description: string, item: string): Obj => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: ref(item) },
          meta: ref('PageMeta'),
        },
      },
    },
  },
});

const idParam: Obj = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', example: '665f1c2a4e1b2c3d4e5f6071' },
};

const query = (name: string, schema: Obj, description = ''): Obj => ({ name, in: 'query', required: false, schema, description });

const paging: Obj[] = [
  query('page', { type: 'integer', minimum: 1, default: 1 }),
  query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 10 }),
];

const auth = [{ bearerAuth: [] }];

// -------------------------------------------------------------------- spec
export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Movie Ticket Booking API',
    version: '1.0.0',
    description: [
      'Customers browse movies, view seats and book tickets. Cinema admins manage movies, showtimes and seat availability.',
      '',
      '**How to try it:**',
      '1. `POST /auth/register` (customer) or with `role: "admin"` + `adminSecret` (cinema admin), then `POST /auth/login`.',
      '2. Copy the `token` from the response, click **Authorize** (top right) and paste it.',
      '3. Admin: create a movie, then a showtime. Customer: check the seats and book.',
    ].join('\n'),
  },
  servers: [{ url: '/api', description: 'Current server' }],
  tags: [
    { name: 'Auth' },
    { name: 'Movies' },
    { name: 'Showtimes' },
    { name: 'Bookings' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    responses: {
      BadRequest: { description: 'Validation error or invalid request', content: { 'application/json': { schema: ref('Error') } } },
      Unauthorized: { description: 'Missing, invalid or expired token', content: { 'application/json': { schema: ref('Error') } } },
      Forbidden: { description: 'Not allowed for this role / not your resource', content: { 'application/json': { schema: ref('Error') } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: ref('Error') } } },
      Conflict: { description: 'Business rule conflict (e.g. seat already booked)', content: { 'application/json': { schema: ref('Error') } } },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
      PageMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['fullName', 'email', 'password'],
        properties: {
          fullName: { type: 'string', example: 'Yofs Ahmed' },
          email: { type: 'string', format: 'email', example: 'yofs@example.com' },
          password: { type: 'string', example: 'Passw0rd!123', description: 'Min 8 chars, upper + lower case, a number and a special character' },
          role: { type: 'string', enum: ['customer', 'admin'], default: 'customer' },
          adminSecret: { type: 'string', description: 'Required only when role is "admin" (ADMIN_REGISTRATION_SECRET on the server)' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'yofs@example.com' },
          password: { type: 'string', example: 'Passw0rd!123' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fullName: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['customer', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResult: {
        type: 'object',
        properties: { user: ref('User'), token: { type: 'string', description: 'JWT - send as Authorization: Bearer <token>' } },
      },
      Movie: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string', example: 'Inception' },
          genre: { type: 'string', example: 'Sci-Fi' },
          duration: { type: 'integer', example: 148, description: 'Minutes' },
          description: { type: 'string' },
          posterUrl: { type: 'string', example: 'https://example.com/inception.jpg' },
          rating: { type: 'number', example: 8.8 },
          status: { type: 'string', enum: ['now_showing', 'coming_soon'] },
          releaseDate: { type: 'string', format: 'date-time' },
        },
      },
      MovieInput: {
        type: 'object',
        required: ['title', 'genre', 'duration', 'description', 'posterUrl'],
        properties: {
          title: { type: 'string', example: 'Inception' },
          genre: { type: 'string', example: 'Sci-Fi' },
          duration: { type: 'integer', example: 148 },
          description: { type: 'string', example: 'A thief who steals corporate secrets through dream-sharing technology.' },
          posterUrl: { type: 'string', example: 'https://example.com/inception.jpg' },
          rating: { type: 'number', minimum: 0, maximum: 10, example: 8.8 },
          status: { type: 'string', enum: ['now_showing', 'coming_soon'], default: 'coming_soon' },
          releaseDate: { type: 'string', format: 'date', example: '2026-10-01' },
        },
      },
      MovieUpdate: {
        type: 'object',
        description: 'Any subset of the movie fields',
        properties: {
          title: { type: 'string' },
          genre: { type: 'string' },
          duration: { type: 'integer' },
          description: { type: 'string' },
          posterUrl: { type: 'string' },
          rating: { type: 'number' },
          status: { type: 'string', enum: ['now_showing', 'coming_soon'] },
          releaseDate: { type: 'string', format: 'date' },
        },
      },
      Showtime: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          movie: { description: 'Populated movie summary', type: 'object' },
          hallNumber: { type: 'integer', example: 3 },
          date: { type: 'string', example: '2026-10-05' },
          startTime: { type: 'string', example: '20:00' },
          endTime: { type: 'string', example: '22:30' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          ticketPrice: { type: 'number', example: 120 },
          totalCapacity: { type: 'integer', example: 80 },
          bookedSeats: { type: 'array', items: { type: 'integer' } },
          blockedSeats: { type: 'array', items: { type: 'integer' } },
          availableSeatsCount: { type: 'integer', example: 78 },
        },
      },
      ShowtimeInput: {
        type: 'object',
        required: ['movie', 'hallNumber', 'date', 'startTime', 'endTime', 'ticketPrice', 'totalCapacity'],
        properties: {
          movie: { type: 'string', description: 'Movie id', example: '665f1c2a4e1b2c3d4e5f6071' },
          hallNumber: { type: 'integer', example: 3 },
          date: { type: 'string', example: '2026-10-05', description: 'YYYY-MM-DD (cinema local time), must be in the future' },
          startTime: { type: 'string', example: '20:00', description: 'HH:mm (24h)' },
          endTime: { type: 'string', example: '22:30', description: 'HH:mm (24h)' },
          ticketPrice: { type: 'number', example: 120 },
          totalCapacity: { type: 'integer', example: 80 },
        },
      },
      ShowtimeUpdate: {
        type: 'object',
        description: 'Any subset of the showtime fields (use this to update the ticket price)',
        properties: {
          movie: { type: 'string' },
          hallNumber: { type: 'integer' },
          date: { type: 'string', example: '2026-10-06' },
          startTime: { type: 'string', example: '21:00' },
          endTime: { type: 'string', example: '23:30' },
          ticketPrice: { type: 'number', example: 150 },
          totalCapacity: { type: 'integer' },
        },
      },
      SeatMap: {
        type: 'object',
        properties: {
          showtimeId: { type: 'string' },
          totalCapacity: { type: 'integer', example: 80 },
          ticketPrice: { type: 'number', example: 120 },
          isBookable: { type: 'boolean', description: 'false once the show has started' },
          availableSeats: { type: 'array', items: { type: 'integer' } },
          bookedSeats: { type: 'array', items: { type: 'integer' } },
          blockedSeats: { type: 'array', items: { type: 'integer' } },
        },
      },
      ManageSeatsInput: {
        type: 'object',
        required: ['action', 'seats'],
        properties: {
          action: { type: 'string', enum: ['block', 'unblock'] },
          seats: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
        },
      },
      BookingInput: {
        type: 'object',
        required: ['showtimeId', 'seats'],
        properties: {
          showtimeId: { type: 'string', example: '665f1c2a4e1b2c3d4e5f6072' },
          seats: { type: 'array', items: { type: 'integer' }, example: [5, 6], description: 'Seat numbers, 1..totalCapacity, no duplicates' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          customer: { type: 'string', description: 'User id (populated with fullName/email for admins)' },
          showtime: { type: 'object', description: 'Populated showtime with movie summary' },
          seats: { type: 'array', items: { type: 'integer' } },
          totalPrice: { type: 'number', example: 240 },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
          cancelledAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Stats: {
        type: 'object',
        properties: {
          movies: { type: 'object', properties: { total: { type: 'integer' }, nowShowing: { type: 'integer' }, comingSoon: { type: 'integer' } } },
          upcomingShowtimes: { type: 'integer' },
          customers: { type: 'integer' },
          bookings: { type: 'object', properties: { pending: { type: 'integer' }, confirmed: { type: 'integer' }, cancelled: { type: 'integer' } } },
          ticketsSold: { type: 'integer' },
          revenue: { type: 'number' },
          topMovies: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  paths: {
    // ------------------------------------------------------------- Auth
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description:
          'Anyone can register as a `customer`. To create a Cinema Admin send `role: "admin"` together with the `adminSecret` configured on the server.',
        requestBody: jsonBody('RegisterInput'),
        responses: { '201': ok('Registered', ref('AuthResult')), ...errors(400, 403, 409) },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in and receive a JWT',
        requestBody: jsonBody('LoginInput'),
        responses: { '200': ok('Logged in', ref('AuthResult')), ...errors(400, 401) },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the logged-in user',
        security: auth,
        responses: { '200': ok('Current user', ref('User')), ...errors(401) },
      },
    },

    // ----------------------------------------------------------- Movies
    '/movies': {
      get: {
        tags: ['Movies'],
        summary: 'Browse movies (search, filter, sort, paginate)',
        parameters: [
          query('search', { type: 'string' }, 'Movie title (partial, case-insensitive)'),
          query('genre', { type: 'string' }, 'Genre (case-insensitive)'),
          query('status', { type: 'string', enum: ['now_showing', 'coming_soon'] }),
          query('date', { type: 'string', example: '2026-10-05' }, 'Only movies with an upcoming showtime on this date (YYYY-MM-DD)'),
          query('sortBy', { type: 'string', enum: ['rating', 'releaseDate', 'title', 'createdAt'], default: 'createdAt' }),
          query('order', { type: 'string', enum: ['asc', 'desc'], default: 'desc' }),
          ...paging,
        ],
        responses: { '200': okList('List of movies', 'Movie'), ...errors(400) },
      },
      post: {
        tags: ['Movies'],
        summary: 'Create a movie (Admin)',
        security: auth,
        requestBody: jsonBody('MovieInput'),
        responses: { '201': ok('Movie created', ref('Movie')), ...errors(400, 401, 403) },
      },
    },
    '/movies/{id}': {
      get: {
        tags: ['Movies'],
        summary: 'Get one movie',
        parameters: [idParam],
        responses: { '200': ok('Movie', ref('Movie')), ...errors(400, 404) },
      },
      patch: {
        tags: ['Movies'],
        summary: 'Update a movie (Admin)',
        security: auth,
        parameters: [idParam],
        requestBody: jsonBody('MovieUpdate'),
        responses: { '200': ok('Movie updated', ref('Movie')), ...errors(400, 401, 403, 404) },
      },
      delete: {
        tags: ['Movies'],
        summary: 'Delete a movie - soft delete (Admin)',
        description: 'Blocked while the movie still has upcoming showtimes.',
        security: auth,
        parameters: [idParam],
        responses: { '200': { description: 'Movie deleted' }, ...errors(400, 401, 403, 404, 409) },
      },
    },

    // -------------------------------------------------------- Showtimes
    '/showtimes': {
      get: {
        tags: ['Showtimes'],
        summary: 'Browse showtimes (upcoming by default)',
        parameters: [
          query('movieId', { type: 'string' }),
          query('date', { type: 'string', example: '2026-10-05' }, 'YYYY-MM-DD'),
          query('timeFrom', { type: 'string', example: '18:00' }, 'Start time from (HH:mm)'),
          query('timeTo', { type: 'string', example: '23:00' }, 'Start time until (HH:mm)'),
          query('hallNumber', { type: 'integer' }),
          query('includePast', { type: 'string', enum: ['true', 'false'], default: 'false' }),
          ...paging,
        ],
        responses: { '200': okList('List of showtimes', 'Showtime'), ...errors(400) },
      },
      post: {
        tags: ['Showtimes'],
        summary: 'Create a showtime (Admin)',
        description: 'Must be in the future and must not overlap another show in the same hall.',
        security: auth,
        requestBody: jsonBody('ShowtimeInput'),
        responses: { '201': ok('Showtime created', ref('Showtime')), ...errors(400, 401, 403, 404, 409) },
      },
    },
    '/showtimes/{id}': {
      get: {
        tags: ['Showtimes'],
        summary: 'Get one showtime',
        parameters: [idParam],
        responses: { '200': ok('Showtime', ref('Showtime')), ...errors(400, 404) },
      },
      patch: {
        tags: ['Showtimes'],
        summary: 'Update a showtime / ticket price (Admin)',
        security: auth,
        parameters: [idParam],
        requestBody: jsonBody('ShowtimeUpdate'),
        responses: { '200': ok('Showtime updated', ref('Showtime')), ...errors(400, 401, 403, 404, 409) },
      },
      delete: {
        tags: ['Showtimes'],
        summary: 'Delete a showtime (Admin)',
        description: 'Blocked when the showtime has confirmed bookings.',
        security: auth,
        parameters: [idParam],
        responses: { '200': { description: 'Showtime deleted' }, ...errors(400, 401, 403, 404, 409) },
      },
    },
    '/showtimes/{id}/seats': {
      get: {
        tags: ['Showtimes'],
        summary: 'View available seats of a showtime',
        parameters: [idParam],
        responses: { '200': ok('Seat map', ref('SeatMap')), ...errors(400, 404) },
      },
      patch: {
        tags: ['Showtimes'],
        summary: 'Block / unblock seats (Admin)',
        description: 'Blocked seats cannot be booked. Seats that are already booked cannot be blocked.',
        security: auth,
        parameters: [idParam],
        requestBody: jsonBody('ManageSeatsInput'),
        responses: { '200': ok('Seats updated', ref('Showtime')), ...errors(400, 401, 403, 404, 409) },
      },
    },

    // --------------------------------------------------------- Bookings
    '/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Book seats (Customer)',
        description:
          'Seats are reserved atomically: if any seat was taken in the meantime the request fails with 409 and nothing is booked.',
        security: auth,
        requestBody: jsonBody('BookingInput'),
        responses: { '201': ok('Booking confirmed', ref('Booking')), ...errors(400, 401, 403, 404, 409) },
      },
      get: {
        tags: ['Bookings'],
        summary: 'List all bookings (Admin)',
        security: auth,
        parameters: [
          query('status', { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] }),
          query('showtimeId', { type: 'string' }),
          query('customerId', { type: 'string' }),
          ...paging,
        ],
        responses: { '200': okList('All bookings', 'Booking'), ...errors(400, 401, 403) },
      },
    },
    '/bookings/my': {
      get: {
        tags: ['Bookings'],
        summary: 'My booking history (Customer)',
        security: auth,
        parameters: [query('status', { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] }), ...paging],
        responses: { '200': okList('My bookings', 'Booking'), ...errors(400, 401, 403) },
      },
    },
    '/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get one booking (owner or Admin)',
        security: auth,
        parameters: [idParam],
        responses: { '200': ok('Booking', ref('Booking')), ...errors(400, 401, 403, 404) },
      },
    },
    '/bookings/{id}/cancel': {
      patch: {
        tags: ['Bookings'],
        summary: 'Cancel my booking (Customer)',
        description: 'Only before the movie starts. The seats are released automatically.',
        security: auth,
        parameters: [idParam],
        responses: { '200': ok('Booking cancelled', ref('Booking')), ...errors(400, 401, 403, 404, 409) },
      },
    },

    // ------------------------------------------------------------ Admin
    '/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Dashboard statistics (Admin)',
        security: auth,
        responses: { '200': ok('Statistics', ref('Stats')), ...errors(401, 403) },
      },
    },
  },
};
