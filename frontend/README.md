# 🎨 PlanForge Frontend

PlanForge frontend web application built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Radix UI**, **@dnd-kit**, and **TanStack Query v5**.

---

## 🚀 Key Features & Pages

- **Interactive Kanban Board (`/board`)**: Drag-and-drop task workflow powered by `@dnd-kit` with column WIP limits and optimistic updates.
- **Multifaceted Task List (`/tasks`)**: Comprehensive task table with instant search, multi-project filtering, status, priority, assignee, and sprint facets.
- **Sprint Management (`/sprints`)**: Active sprint boards, sprint planning, and backlog views.
- **Members & RBAC Directory (`/members`)**: Member management with role assignment and self-protection safeguards.
- **Audit Log Trail (`/audit-log`)**: Visual history of all system changes, entity mutations, and actor timestamps.
- **CSV Import / Export (`/import`)**: Interactive batch data importing and exporting with validation.
- **Real-Time Live Updates**: Socket.IO client synchronization for real-time task movement and notifications.

---

## 🏃 Running the Frontend

From the repository root:
```bash
# Start frontend development server (Port 3000)
pnpm dev:frontend

# Build optimized production bundle
pnpm build:frontend
```

---

## ⚙️ Environment Configuration

`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```
