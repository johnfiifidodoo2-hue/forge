# Forge

A cross-disciplinary collaboration and resource-exchange platform connecting **developers**, **UI/UX designers**, and **technical writers** — pitch ideas in the Idea Tank, share assets in the Resource Exchange, and book time with Experts.

## Stack
Node.js · Express · Prisma · PostgreSQL · Vanilla JS + custom CSS

## Project structure
```
forge/
├── prisma/
│   ├── schema.prisma   (User, Project, Comment, Resource, Booking, Follow, Notification)
│   └── seed.js         (demo data: 6 users, 6 ideas, 9 resources, 5 bookings…)
├── middleware/
│   └── auth.js
├── routes/
│   ├── auth.js         (signup, login, me, profile)
│   ├── ideaTank.js     (projects, comments, upvotes, saves)
│   ├── resources.js    (share / edit / delete resources)
│   ├── bookings.js     (experts, booking flow, status, notes, ratings)
│   ├── notifications.js
│   └── dashboard.js    (stats, activity feed, leaderboard)
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── db.js
├── server.js
├── package.json
└── .env.example
```

## 1. Prerequisites
- Node.js 18+
- A running PostgreSQL instance. Quickest local option via Docker:
  ```bash
  docker run --name forge-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=forge_db -p 5432:5432 -d postgres:16
  ```
  This gives you `DATABASE_URL="postgresql://postgres:password@localhost:5432/forge_db?schema=public"`

## 2. Install dependencies
```bash
cd forge
npm install
```

## 3. Configure environment variables
Copy the example file and fill in your own values:
```bash
cp .env.example .env
```
Edit `.env`:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/forge_db?schema=public"
JWT_SECRET="a-long-random-string"
PORT=4000
```

## 4. Push schema to database & generate client
```bash
npm run prisma:generate
npm run prisma:push
```
Then seed demo data:
```bash
npm run seed
```
Demo logins (password for all: `Password123!`):
- `creator@forge.dev` / `kai@forge.dev` — Creator role
- `expert@forge.dev` / `mentor@forge.dev` / `maya@forge.dev` — Expert role
- `demo@forge.dev` — Creator

## 5. Start the server
```bash
npm start
```
For auto-restart on file changes during development:
```bash
npm run dev
```
The app will be live at **http://localhost:4000**.

## 6. Using the app
1. Open `http://localhost:4000` in your browser.
2. Log in with a demo account (see above) or sign up — choose role **Creator** (developer/designer/writer) or **Expert** (mentor). An Expert account is required for the Booking tab to show anyone to book.
3. **Dashboard** — personal stats, recent activity feed, and a top-ideas / top-contributors / top-experts leaderboard.
4. **Idea Tank** — pitch a project with tags, comment inline, upvote, save ideas, and edit or delete your own. Filter by "My ideas" / "Saved".
5. **Resource Exchange** — share UI Kits / Code Snippets / Templates, filter by category, and edit or delete your own posts.
6. **Expert Booking** — browse experts (sort by rating or followers), follow them, and request a time slot. View your sessions (as either party), confirm/cancel/complete, and rate completed sessions.
7. **Profile** — update your bio and skills, see your own ideas and resources.

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | – | Create an account, returns `{ user, token }` |
| POST | `/api/auth/login` | – | Log in, returns `{ user, token }` |
| GET | `/api/auth/me` | ✅ | Get the current logged-in user |
| PATCH | `/api/auth/profile` | ✅ | Update `{ bio, skills }` |
| GET | `/api/ideatank/projects` | – | List all projects with author + comments |
| POST | `/api/ideatank/projects` | ✅ | Create a project `{ title, description, tags }` |
| PATCH | `/api/ideatank/projects/:id` | ✅ | Edit own project |
| DELETE | `/api/ideatank/projects/:id` | ✅ | Delete own project |
| POST | `/api/ideatank/projects/:id/comments` | ✅ | Comment on a project `{ content }` |
| POST | `/api/ideatank/projects/:id/upvote` | ✅ | Toggle upvote |
| POST | `/api/ideatank/projects/:id/save` | ✅ | Toggle saved idea |
| GET | `/api/ideatank/saved` | ✅ | List saved ideas for current user |
| GET | `/api/resources?category=` | – | List resources, optional category filter |
| POST | `/api/resources` | ✅ | Share a resource `{ title, description, category, downloadUrl }` |
| PATCH | `/api/resources/:id` | ✅ | Edit own resource |
| DELETE | `/api/resources/:id` | ✅ | Delete own resource |
| GET | `/api/bookings/experts` | – | List users with role `EXPERT`, optional `?search=&skill=&sort=` |
| POST | `/api/bookings` | ✅ | Request a booking `{ expertId, scheduledAt, title }` |
| GET | `/api/bookings/mine` | ✅ | List bookings for the current user |
| PATCH | `/api/bookings/:id/status` | ✅ | Confirm/cancel/complete a booking |
| PATCH | `/api/bookings/:id/notes` | ✅ | Add notes to a booking |
| POST | `/api/bookings/:id/rating` | ✅ | Creator rates a completed session |
| POST | `/api/users/:id/follow` | ✅ | Toggle follow a user (e.g. an expert) |
| GET | `/api/users/:id` | – | Public profile with follower counts |
| GET | `/api/notifications` | ✅ | List notifications for current user |
| PATCH | `/api/notifications/read-all` | ✅ | Mark all notifications read |
| GET | `/api/dashboard/stats` | ✅ | Personal overview metrics |
| GET | `/api/dashboard/activity` | ✅ | Recent platform activity feed |
| GET | `/api/dashboard/leaderboard` | – | Top ideas, contributors, and experts |

Authenticated routes expect an `Authorization: Bearer <token>` header. The token returned at signup/login is stored in the browser's `localStorage` by the frontend automatically.

## Notes on production readiness
- Passwords are hashed with `bcryptjs` before storage; never stored in plaintext.
- Auth uses stateless JWTs (7 day expiry) signed with `JWT_SECRET` — rotate this secret and keep it out of source control.
- Add rate limiting (e.g. `express-rate-limit`) and HTTPS termination (via a reverse proxy like Nginx or your hosting platform) before deploying publicly.
- For production Postgres, prefer a managed provider and enable SSL (`?sslmode=require` in `DATABASE_URL`).
