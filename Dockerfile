# HabitGo — single container: Express API + built web app (same origin).
# Used by Hugging Face Spaces (free, no card required). Data lives in Turso
# (DATABASE_URL + DATABASE_TOKEN set as Space secrets), so the ephemeral
# container filesystem is safe — nothing important is stored locally.

FROM node:22-slim

WORKDIR /opt/habitgo

# --- backend dependencies (cached layer) ---
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# --- web app: deps, source, build ---
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci
COPY app/ ./app/
RUN cd app && npm run build

# --- backend source ---
COPY backend/ ./backend/

ENV NODE_ENV=production
ENV PORT=7860
EXPOSE 7860

CMD ["node", "backend/src/index.js"]
