# OpenGlimpse

OpenGlimpse is a webapp that integrates AI to allow for quick registration and verification for event registration. It provides real-time facial-recognition attendance with QR-code backup scanning and an AI chatbot assistant for SCCCI overseas business delegations.

## Project Structure

```
src/
  client/            # React (Vite) frontend
  server/            # Node.js Express backend + Socket.io
    database/        # Sequelize models (PostgreSQL)
    modules/         # feature modules (facial_recog, chat, auth, programmes, sync)
    python_server/   # FastAPI FaceNet server (embedded, spawned by backend)
docs/                # per-member API / schema / use-case documentation
tests/               # endpoint + sync test suites
```

## 1. Running Locally

### Prerequisites

- **Node.js** (v22+, per `package.json`)
- **PostgreSQL** running locally (default connection: `postgres:postgres@localhost:5432/openglimpse`)
- **Python 3.10+** (for the FaceNet server) — a local venv at repo root (`.venv/`) is auto-detected; otherwise install `src/server/python_server/requirements.txt` (`fastapi`, `uvicorn`, `deepface`, `opencv-python`, `tf-keras`, `numpy`, `python-multipart`)

### Setup

1. Install dependencies:
   ```sh
   npm install
   npm install --prefix src/server
   npm install --prefix src/client
   ```
2. Configure environment — copy `.env.example` to `.env` and fill in values (database connection, `GROQ_API_KEY` for the chatbot, etc.):
   ```sh
   cp .env.example .env
   ```
3. (Optional) Seed test users + a test programme from `src/server/modules/facial_recog/test-images/`:
   ```sh
   npm run seed
   ```

### Run

From the repo root, start both the backend and frontend together:

```sh
npm run dev
```

- Backend API: `http://localhost:3001` (Express + Socket.io; auto-starts the Python FaceNet server on `127.0.0.1:8000`)
- Frontend app: `https://localhost:5173` (Vite dev server, HTTPS via `@vitejs/plugin-basic-ssl`)

Or run each separately: `npm run dev:server` and `npm run dev:client`.

On first boot the backend auto-syncs the database and seeds a default staff account `admin@openglimpse.com` (password `admin123`) plus the chatbot user `ai-assistant@openglimpse.com`.

### Running tests

- Ryan's endpoint tests: `npm run test:ryan`
- Python FaceNet endpoint tests: `npm run test:python`
- Server sync replay tests (`src/server`): `npm run test:sync`
- Client offline-layer tests (`src/client`): `npm run test:sync`

## 2. Deploying

The app has two deployable parts plus a database and the embedded Python service.

### Database

Provision a managed PostgreSQL instance (e.g. Supabase, RDS, Alibaba Cloud RDS) and set `DATABASE_URL` in the backend environment. Sequelize auto-creates/alters tables on boot.

### Backend (Express + Socket.io + FaceNet)

Currently deployed on Render at `https://openglimpse-2.onrender.com`. Deploy to any Node host that can keep a long-running process (VM, Railway, Render, Alibaba Cloud ECS). Requirements:

1. Node v22+, and a Python environment with `src/server/python_server/requirements.txt` installed (the backend spawns the FastAPI FaceNet server on boot).
2. Environment variables (see `.env` / `.env.example`):
   - `DATABASE_URL` (or `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT`)
   - `PORT` (default `3001`)
   - `CLIENT_URL` — allowed CORS origin, e.g. `https://openglimpse.pages.dev`
   - `GROQ_API_KEY` / `GROQ_MODEL` — chatbot provider (current model: `openai/gpt-oss-20b`)
   - `PYTHON_SERVER_URL` — external FaceNet server URL if not spawned locally (currently `https://openglimpse.onrender.com`)
3. Start with `node src/server/index.js` (the root `start`/`dev` scripts in `package.json`).

### Frontend (React + Vite)

Currently deployed on Cloudflare Pages at `https://openglimpse.pages.dev`. To redeploy:

1. Build the static bundle:
   ```sh
   npm run build --prefix src/client
   ```
2. Deploy the `src/client/dist/` output to any static host (Cloudflare Pages, Vercel, Netlify, Alibaba Cloud OSS/CDN, or serve it behind the backend).
3. Set the client build-time env vars so the app calls the deployed backend instead of the dev proxy:
   - `VITE_API_URL` — backend base URL (`https://openglimpse-2.onrender.com`)
   - `VITE_SOCKET_URL` — backend Socket.io URL (`https://openglimpse-2.onrender.com`)
   - `VITE_CHAT_SERVER_URL` — backend `/chat` namespace URL (`https://openglimpse-2.onrender.com`)
   - `VITE_CHATBOT_TRIGGER` — chatbot trigger prefix (default `@assistant`)

### Notes

- WebSockets must be enabled on the backend host / load balancer for real-time attendance and chat.
- Because the backend spawns the Python FaceNet server as a subprocess, the host must have the Python dependencies installed and the venv path discoverable.
- The dev-only proxy table in `src/client/vite.config.js` does not apply to production; configure the `VITE_*` vars instead.

## 3. Public URLs

- **Frontend:** https://openglimpse.pages.dev
- **Backend API / Socket.io:** https://openglimpse-2.onrender.com
- **FaceNet (Python) server:** https://openglimpse.onrender.com
