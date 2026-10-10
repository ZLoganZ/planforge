# 🚀 PlanForge — Enterprise Agile Project Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%7C%206.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3.8%20(App%20Router)-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12.0-red?logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?logo=vitest)](https://vitest.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com/)

**PlanForge** is a modern, high-performance, full-stack monorepo for Agile Project Management and Task Tracking. It brings Jira and Linear-grade task tracking, sprint management, drag-and-drop Kanban boards, role-based access control (RBAC), real-time WebSockets synchronization, background queue processing, and transactional email testing into a unified developer experience.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Key Features](#-key-features)
- [Monorepo Structure](#-monorepo-structure)
- [Docker Infrastructure & Services](#-docker-infrastructure--services)
- [Quick Start Guide](#-quick-start-guide)
- [Default Seed Accounts & RBAC Matrix](#-default-seed-accounts--rbac-matrix)
- [Interactive API Documentation (Swagger)](#-interactive-api-documentation-swagger)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Environment Variables Configuration](#-environment-variables-configuration)
- [Scripts Reference](#-scripts-reference)

---

## 🏛 Architectural Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend (Next.js 16 App Router)"]
        UI["React 19 + Tailwind v4 + Radix UI"]
        TQ["TanStack Query v5 (State & Cache)"]
        DND["@dnd-kit (Kanban Board)"]
        SIO_Client["Socket.IO Client (Real-Time Push)"]
    end

    subgraph API_Gateway ["Backend API (NestJS 12)"]
        HTTP["Express HTTP Server (:4000/api)"]
        Swagger["Swagger UI (:4000/api/docs)"]
        Guard["JWT Auth & Hierarchical RBAC Guards"]
        Interceptor["Audit Trail & Transform Interceptors"]
        WS_Gateway["Socket.IO Gateway (:4000)"]
    end

    subgraph Data_Layer ["Infrastructure (Docker Compose)"]
        Postgres[("PostgreSQL 16 (:5432) \nPrisma ORM")]
        Redis[("Redis 7 (:6379) \nToken Blacklist & BullMQ Queues")]
        MinIO[("MinIO S3 (:9000 / :9001) \nPresigned Uploads & Avatars")]
        Mailpit[("Mailpit (:1025 / :8025) \nSMTP Capture & Web UI")]
    end

    UI --> HTTP
    SIO_Client <--> WS_Gateway
    HTTP --> Guard --> Interceptor
    Interceptor --> Postgres
    HTTP --> Redis
    HTTP --> MinIO
    HTTP --> Mailpit
```

---

## ✨ Key Features

### 1. 📋 Drag-and-Drop Kanban & Sprint Lifecycle
- **Interactive Kanban Boards**: Drag-and-drop powered by `@dnd-kit` with column WIP limits, real-time status transitions (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `CANCELLED`), and optimistic UI updates.
- **Sprint Management**: Plan, activate, and complete sprints with velocity calculation and automated rollover of incomplete backlog items.
- **Subtasks & Dependencies**: Multi-level task decomposition and attachment tracking.

### 2. 🛡 Hierarchical Role-Based Access Control (RBAC)
- **Granular Role Hierarchy**: `OWNER` > `ADMIN` > `MEMBER` > `VIEWER`.
- **Hardened Boundary Protection**:
  - The Workspace Owner account cannot be deactivated, deleted, or demoted.
  - Admins cannot deactivate, delete, or modify roles of other Admins or the Workspace Owner.
  - Regular Members and Viewers cannot modify membership or system settings.
  - Users cannot self-escalate roles or deactivate their own accounts via user management endpoints.

### 3. 🔍 Multifaceted Search & Dynamic Task Filtering
- Multi-dimensional query engine supporting simultaneous filtering by:
  - Search query (title, description, key)
  - Projects (single or multi-project arrays)
  - Sprints (active, backlog, or specific sprint IDs)
  - Statuses (`TODO`, `IN_PROGRESS`, etc.)
  - Priorities (`URGENT`, `HIGH`, `MEDIUM`, `LOW`, `NONE`)
  - Assignees & Reporters
  - Labels & Tags

### 4. ⚡ Real-Time Live Sync & WebSockets
- Socket.IO gateway broadcasting live task updates (`created`, `updated`, `deleted`) across team members in the same project.
- In-app notification center notifying assignees and stakeholders upon assignment or status change.

### 5. 📬 Transactional Email via Mailpit
- Integrated Mailpit SMTP server for zero-configuration local email testing.
- Inspect verification, onboarding, and invitation emails with HTML preview at `http://localhost:8025`.
- Production-ready fallback for external SMTP relays (Brevo, SendGrid, Amazon SES).

### 6. 📦 Asynchronous Data Import & Export
- BullMQ worker queues backed by Redis for background batch processing of CSV data.
- Non-blocking task import/export workflows with progress monitoring.

### 7. 🗄 S3-Compatible Object Storage (MinIO)
- Secure presigned URL uploads for task attachments, documents, and user avatars.
- Web administration console accessible at `http://localhost:9001`.

### 8. 📜 Enterprise Audit Trail
- Automated logging of system events (`CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `ASSIGN`).
- Exact field-level diffs, actor attribution, timestamps, and entity metadata captured for compliance and tracking.

---

## 📁 Monorepo Structure

```text
planforge/
├── backend/                       # NestJS 12 API Application
│   ├── prisma/
│   │   ├── schema.prisma          # Database models, enums & relations
│   │   └── seed.ts                # Database seed script
│   ├── src/
│   │   ├── common/                # Guards, interceptors, filters, decorators
│   │   ├── database/              # Prisma & Redis service providers
│   │   └── modules/               # Domain feature modules
│   │       ├── analytics/         # Agile reports & project metrics
│   │       ├── attachments/       # File upload & metadata management
│   │       ├── audit-logs/        # System audit trail logger
│   │       ├── auth/              # JWT auth, token rotation & blacklist
│   │       ├── comments/          # Task discussions & mentions
│   │       ├── email/             # Nodemailer service & HTML templates
│   │       ├── import-export/     # BullMQ CSV queue processing
│   │       ├── invitations/       # Cryptographic workspace invites
│   │       ├── labels/            # Task tags & color codes
│   │       ├── notifications/     # WebSockets gateway & notification inbox
│   │       ├── projects/          # Project workspaces & memberships
│   │       ├── sprints/           # Sprint planning & lifecycle
│   │       ├── storage/           # MinIO / AWS S3 presigned client
│   │       ├── tasks/             # Core task management & filtering
│   │       ├── users/             # User directory & RBAC enforcement
│   │       └── workspaces/        # Workspace settings & membership
│   ├── test/                      # End-to-end (E2E) integration test suites
│   ├── vitest.config.ts           # Vitest unit test configuration
│   └── vitest.config.e2e.ts       # Vitest E2E test configuration
├── frontend/                      # Next.js 16 App Router Frontend
│   └── src/
│       ├── app/                   # App Router pages (/board, /tasks, /members, etc.)
│       ├── components/            # Reusable UI component library (Radix + Tailwind)
│       ├── context/               # Authentication & theme providers
│       ├── hooks/                 # React Query hooks & WebSocket listeners
│       └── lib/                   # API clients, axios interceptors & utilities
├── docker-compose.yml             # PostgreSQL, Redis, MinIO, Mailpit services
├── package.json                   # Root monorepo workspace configuration
├── pnpm-workspace.yaml            # pnpm workspace definition
└── README.md                      # Project documentation
```

---

## 🐳 Docker Infrastructure & Services

Launch all required backing services in one command:

```bash
pnpm docker:up
```

| Service | Container Name | Host Port | Protocol / Purpose | Web Console / UI | Default Credentials |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | `planforge-postgres` | `5432` | Relational Database | — | `postgres` / `postgres` (db: `planforge`) |
| **Redis 7** | `planforge-redis` | `6379` | Cache, Blacklist & BullMQ | — | — |
| **MinIO S3** | `planforge-minio` | `9000` / `9001` | S3 API (`9000`) & Web Console (`9001`) | `http://localhost:9001` | User: `minioadmin` / Pass: `minioadmin` |
| **Mailpit** | `planforge-mailpit` | `1025` / `8025` | SMTP Server (`1025`) & Web UI (`8025`) | `http://localhost:8025` | No auth required |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v20.x` or later (LTS recommended)
- **pnpm**: `v9.x` or `v10.x` (`npm install -g pnpm`)
- **Docker & Docker Compose**: Installed and running

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/planforge.git
cd planforge
pnpm install
```

### 2. Configure Environment Files
Copy the example environment configurations:
```bash
cp .env.example backend/.env
```
*(Backend `.env` defaults match the provided `docker-compose.yml` configuration out of the box).*

### 3. Start Docker Containers
```bash
pnpm docker:up
```

### 4. Run Migrations & Seed Database
```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Launch Development Servers
Open two terminal tabs (or run from root):
```bash
# Terminal 1: NestJS Backend API (Port 4000)
pnpm dev:backend

# Terminal 2: Next.js Frontend (Port 3000)
pnpm dev:frontend
```

Now open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Default Seed Accounts & RBAC Matrix

The seed script creates a pre-configured team workspace with 4 accounts demonstrating each authorization tier:

| Email | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| `admin@planforge.dev` | `password123` | **OWNER** | Full system control, invite/remove any user, assign roles, workspace settings, cannot be deactivated. |
| `john@planforge.dev` | `password123` | **ADMIN** | Manage projects, sprints, tasks, and invite regular members. Cannot modify Owners or other Admins. |
| `jane@planforge.dev` | `password123` | **MEMBER** | Create, update, and manage tasks, sprints, comments, and attachments. Cannot manage members or workspace settings. |
| `viewer@planforge.dev` | `password123` | **VIEWER** | Read-only access to boards, task lists, timelines, and audit logs. |

---

## 📖 Interactive API Documentation (Swagger)

The backend provides complete OpenAPI (Swagger 3.0) specifications with live interactive testing:

- **Swagger UI**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **OpenAPI JSON**: [http://localhost:4000/api/docs-json](http://localhost:4000/api/docs-json)

### Main Endpoint Groups

- `POST /api/auth/login` — Authenticate and receive JWT access/refresh tokens.
- `GET /api/auth/profile` — Fetch current user profile.
- `POST /api/auth/logout` — Revoke active token in Redis blacklist.
- `GET /api/tasks` — Multifaceted task query engine with pagination.
- `POST /api/tasks` — Create new task with automated project numbering (`PF-1`).
- `PATCH /api/tasks/:id` — Update status, priority, or assignee (emits WebSocket event).
- `GET /api/workspaces` — Retrieve workspaces for current user.
- `GET /api/projects` — List projects and associated member counts.
- `GET /api/sprints` — Sprint lifecycle management and backlog.
- `POST /api/invitations` — Send email invitation to prospective workspace members.
- `GET /api/audit-logs` — Query system change logs and diffs.

---

## 🧪 Testing & Quality Assurance

PlanForge includes comprehensive unit testing and end-to-end (E2E) integration testing powered by **Vitest** and **Supertest**.

### Run Unit Tests
Unit tests verify business logic and RBAC constraints across all core services (`UsersService`, `WorkspacesService`, `TasksService`, `ProjectsService`, `InvitationsService`, `TokenBlacklistService`):

```bash
pnpm test
```
*Current coverage: 8 test suites, 62 tests passing in under 1 second.*

### Run End-to-End (E2E) Integration Tests
E2E integration tests execute against the full NestJS application stack, testing real HTTP endpoints, JWT guards, cookies, validation pipes, and RBAC boundary enforcement:

```bash
pnpm test:e2e
```
*Includes tests for:*
- Public health check endpoint (`GET /api`)
- Bad password rejection (`401 Unauthorized`)
- Login and token generation (`POST /api/auth/login`)
- Protected profile access (`GET /api/auth/profile`)
- Workspace and project retrieval (`GET /api/workspaces`, `GET /api/projects`)
- Filtered task querying (`GET /api/tasks?priorities=HIGH`)
- RBAC boundary violation: regular members attempting to deactivate admins (`403 Forbidden`)
- RBAC boundary violation: admins attempting to deactivate the owner account (`403 Forbidden`)

### Run Test Coverage
```bash
pnpm test:cov
```

### Validate Production Builds
Ensure 100% type safety and bundle verification:
```bash
pnpm build:backend
pnpm build:frontend
```

---

## ⚙️ Environment Variables Configuration

### Backend (`backend/.env`)

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/planforge"

# Server
PORT=4000
CORS_ORIGIN="http://localhost:3000"

# Security (JWT)
JWT_ACCESS_SECRET="planforge-access-secret-change-me"
JWT_REFRESH_SECRET="planforge-refresh-secret-change-me"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis Cache & BullMQ Queues
REDIS_HOST="localhost"
REDIS_PORT=6379

# MinIO / S3 Storage
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="planforge-uploads"
S3_REGION="us-east-1"

# Email Delivery (Mailpit for local dev)
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="PlanForge <no-reply@planforge.dev>"
APP_URL="http://localhost:3000"
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```

---

## 🛠 Scripts Reference

Run from the root of the monorepo:

| Command | Description |
| :--- | :--- |
| `pnpm dev:backend` | Start NestJS backend in hot-reload watch mode (`http://localhost:4000`) |
| `pnpm dev:frontend` | Start Next.js frontend dev server (`http://localhost:3000`) |
| `pnpm build:backend` | Compile backend TypeScript to production `dist/` |
| `pnpm build:frontend` | Generate optimized Next.js production build |
| `pnpm test` | Run all backend unit tests using Vitest |
| `pnpm test:e2e` | Run all end-to-end integration tests using Supertest & Vitest |
| `pnpm test:cov` | Generate test coverage report |
| `pnpm docker:up` | Launch PostgreSQL, Redis, MinIO, and Mailpit containers |
| `pnpm docker:down` | Stop and tear down Docker containers |
| `pnpm docker:logs` | Stream live Docker container logs |
| `pnpm db:migrate` | Apply Prisma schema migrations |
| `pnpm db:seed` | Seed default users, workspaces, projects, sprints, and tasks |
| `pnpm db:studio` | Launch Prisma Studio GUI database inspector |
| `pnpm format` | Auto-format all code in backend and frontend using Prettier |

---

## 📄 License

This project is licensed under the ISC License.
