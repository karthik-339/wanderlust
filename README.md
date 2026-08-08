# WanderLust

A production-oriented full-stack travel listing platform inspired by modern accommodation marketplaces.

- Full-stack architecture using Express, EJS, and MongoDB
- Authentication and authorization with Passport and ownership checks
- Listings and reviews with robust validation and server-side protections
- Cloud image uploads with Cloudinary and Multer
- Geolocation support with map visualization
- Security hardening via Helmet, rate limiting, and Mongo query sanitization
- Scalable listing browsing with pagination and query-based filtering
- Automated test setup with Jest and Supertest

## Tech Stack

- Node.js, Express 5
- EJS, Bootstrap 5
- MongoDB, Mongoose
- Passport.js, express-session, connect-mongo
- Cloudinary, Multer
- Joi validation
- Jest, Supertest

## Core Features

- User signup/login/logout
- Create, edit, delete listings (owner-only controls)
- Upload listing images to Cloudinary
- Create and delete reviews (author-only controls)
- Category filters and search by title/location/country
- Pagination for listing index
- Map preview on listing detail page

## Security and Reliability

- Secure HTTP headers with Helmet and CSP
- Request throttling with express-rate-limit
- Mongo injection protection with server-side key sanitization
- Session persistence in MongoDB (MemoryStore in test mode)
- Centralized async error handling and custom error pages

## Project Structure

- app.js: app bootstrap, middleware, routes, and startup
- controllers/: route handlers
- models/: Mongoose schemas
- routes/: feature routes
- views/: EJS templates
- public/: static CSS and JS assets
- tests/: Jest and Supertest suites

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update .env values (MongoDB URI, session secret, Cloudinary keys).

4. Run development server:

```bash
npm run dev
```

5. Run tests:

```bash
npm test
```

## Scripts

- npm run dev: start with nodemon
- npm start: start production server
- npm test: run test suite
- npm run test:ci: run tests with coverage

## Suggested Resume Bullet Points

- Built and deployed a full-stack travel marketplace with authentication, authorization, reviews, cloud image uploads, and geolocation-based listing experiences.
- Implemented security best practices including Helmet CSP, request rate limiting, and Mongo query sanitization to harden production traffic.
- Improved data retrieval scalability by adding pagination and indexed search/filter support across listings.
- Added automated API smoke tests with Jest and Supertest and integrated quality scripts for repeatable validation.

## Future Improvements

- Add end-to-end integration tests for auth and CRUD flows
- Add role-based admin tools and moderation features
- Add bookmarks/favorites and personalized recommendations
- Add CI pipeline (GitHub Actions) for tests and lint checks
- Add containerization and cloud deployment manifests
