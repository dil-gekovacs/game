# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS frontend-build
WORKDIR /app

# Copy package files for layer caching
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Install dependencies
RUN cd frontend && npm ci

# Copy frontend source and shared types (imported by frontend)
COPY frontend/ ./frontend/
COPY shared/ ./shared/

# Copy assets that are in frontend/public (already there) plus any needed at build
COPY assets/maps/ ./assets/maps/

# Build frontend
RUN cd frontend && npm run build

# ---- Stage 2: Build backend ----
FROM golang:1.22-alpine AS backend-build
WORKDIR /app

# Copy go module files for layer caching
COPY backend/go.mod backend/go.sum ./backend/

RUN cd backend && go mod download

# Copy backend source
COPY backend/ ./backend/

# Copy map assets needed by the backend at runtime (embedded or read from disk)
COPY assets/maps/ ./assets/maps/

# Build static Linux binary
RUN cd backend && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# ---- Stage 3: Runtime ----
FROM alpine:3.19 AS runtime

RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Copy the Go binary
COPY --from=backend-build /server /app/server

# Copy built frontend to be served as static files
COPY --from=frontend-build /app/frontend/dist /app/static

# Copy map assets for the backend game logic
COPY --from=backend-build /app/assets/maps /app/assets/maps

# Switch to non-root user
USER app

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthz || exit 1

ENV STATIC_DIR=/app/static
ENV MAP_DIR=/app/assets/maps

ENTRYPOINT ["/app/server"]
