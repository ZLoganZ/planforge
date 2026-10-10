# ⚙️ PlanForge Backend API

PlanForge backend service built on **NestJS 12**, **Prisma ORM**, **PostgreSQL**, **Redis**, **BullMQ**, and **Socket.IO**.

---

## 🚀 Key Modules & Architecture

- **Auth**: JWT access & refresh token rotation, Redis token blacklist, multi-device logout.
- **Users**: User profiles, avatar updates, hierarchical RBAC permission enforcement.
- **Workspaces & Projects**: Multi-workspace organization, project keys (`PF`), memberships.
- **Tasks**: Dynamic multifaceted query engine, subtasks, project-scoped task numbering.
- **Sprints**: Agile sprint planning, burndown calculations, backlog rollover.
- **Notifications**: Socket.IO WebSockets gateway and in-app notifications inbox.
- **Import/Export**: Asynchronous CSV import/export via BullMQ worker queues.
- **Storage & Attachments**: S3-compatible file storage (MinIO) with presigned URLs.
- **Audit Logs**: Automatic diff tracking and action audit logging.
- **Email**: Mailpit SMTP support for local email testing and production SMTP relays.

---

## 🏃 Running the Backend

From the repository root:
```bash
# Start Docker backing services
pnpm docker:up

# Run database migrations & seed
pnpm db:migrate
pnpm db:seed

# Start backend in watch mode (Port 4000)
pnpm dev:backend
```

---

## 🧪 Testing

```bash
# Run unit tests (Vitest)
pnpm --filter backend test

# Run end-to-end integration tests (Supertest + Vitest)
pnpm --filter backend test:e2e

# Run test coverage
pnpm --filter backend test:cov
```

---

## 📚 API Documentation

Once the backend is running, explore and test the API using Swagger UI:
- **Swagger Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
