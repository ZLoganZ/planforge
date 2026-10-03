import { PrismaClient, Role, TaskStatus, TaskPriority, SprintStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PlanForge database...');

  // ─── Users ─────────────────────────────────────────────────
  const passwordHash = await hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@planforge.dev' },
    update: {},
    create: {
      email: 'admin@planforge.dev',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  const john = await prisma.user.upsert({
    where: { email: 'john@planforge.dev' },
    update: {},
    create: {
      email: 'john@planforge.dev',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
    },
  });

  const jane = await prisma.user.upsert({
    where: { email: 'jane@planforge.dev' },
    update: {},
    create: {
      email: 'jane@planforge.dev',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Smith',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@planforge.dev' },
    update: {},
    create: {
      email: 'viewer@planforge.dev',
      passwordHash,
      firstName: 'View',
      lastName: 'Only',
    },
  });

  console.log('  ✅ Users created');

  // ─── Workspace ─────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'planforge-team' },
    update: {},
    create: {
      name: 'PlanForge Team',
      slug: 'planforge-team',
      description: 'Default workspace for PlanForge development',
    },
  });

  // Add members to workspace
  const workspaceMembers = [
    { userId: admin.id, role: Role.OWNER },
    { userId: john.id, role: Role.ADMIN },
    { userId: jane.id, role: Role.MEMBER },
    { userId: viewer.id, role: Role.VIEWER },
  ];

  for (const member of workspaceMembers) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: member.userId,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: member.userId,
        role: member.role,
      },
    });
  }

  console.log('  ✅ Workspace & members created');

  // ─── Projects ──────────────────────────────────────────────
  const project1 = await prisma.project.upsert({
    where: {
      workspaceId_key: { workspaceId: workspace.id, key: 'PF' },
    },
    update: {},
    create: {
      name: 'PlanForge Platform',
      key: 'PF',
      description: 'Main platform development project',
      color: '#6366f1',
      workspaceId: workspace.id,
    },
  });

  const project2 = await prisma.project.upsert({
    where: {
      workspaceId_key: { workspaceId: workspace.id, key: 'MKT' },
    },
    update: {},
    create: {
      name: 'Marketing Site',
      key: 'MKT',
      description: 'Marketing website and landing pages',
      color: '#f43f5e',
      workspaceId: workspace.id,
    },
  });

  // Add project members
  for (const userId of [admin.id, john.id, jane.id]) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project1.id, userId },
      },
      update: {},
      create: {
        projectId: project1.id,
        userId,
        role: userId === admin.id ? Role.OWNER : Role.MEMBER,
      },
    });
  }

  console.log('  ✅ Projects & members created');

  // ─── Labels ────────────────────────────────────────────────
  const labelData = [
    { name: 'Bug', color: '#ef4444', projectId: project1.id },
    { name: 'Feature', color: '#3b82f6', projectId: project1.id },
    { name: 'Enhancement', color: '#8b5cf6', projectId: project1.id },
    { name: 'Documentation', color: '#06b6d4', projectId: project1.id },
    { name: 'Design', color: '#f59e0b', projectId: project1.id },
    { name: 'Performance', color: '#10b981', projectId: project1.id },
  ];

  const labels: Record<string, { id: string }> = {};
  for (const label of labelData) {
    labels[label.name] = await prisma.label.upsert({
      where: {
        projectId_name: {
          projectId: label.projectId,
          name: label.name,
        },
      },
      update: {},
      create: label,
    });
  }

  console.log('  ✅ Labels created');

  // ─── Sprints ───────────────────────────────────────────────
  const sprint1 = await prisma.sprint.create({
    data: {
      name: 'Sprint 1 — Foundation',
      goal: 'Set up core infrastructure, auth, and project structure',
      status: SprintStatus.COMPLETED,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-14'),
      projectId: project1.id,
    },
  });

  const sprint2 = await prisma.sprint.create({
    data: {
      name: 'Sprint 2 — Core Features',
      goal: 'Implement task management, data tables, and filtering',
      status: SprintStatus.ACTIVE,
      startDate: new Date('2026-09-15'),
      endDate: new Date('2026-09-28'),
      projectId: project1.id,
    },
  });

  const sprint3 = await prisma.sprint.create({
    data: {
      name: 'Sprint 3 — Kanban & DnD',
      goal: 'Build Kanban board with drag and drop',
      status: SprintStatus.PLANNING,
      projectId: project1.id,
    },
  });

  console.log('  ✅ Sprints created');

  // ─── Tasks ─────────────────────────────────────────────────
  const taskData = [
    {
      taskNumber: 1,
      title: 'Set up NestJS backend with Prisma',
      description: 'Initialize NestJS project, configure Prisma ORM, and create database schema',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      storyPoints: 5,
      assigneeId: john.id,
      reporterId: admin.id,
      sprintId: sprint1.id,
      completedAt: new Date('2026-09-03'),
    },
    {
      taskNumber: 2,
      title: 'Implement JWT authentication',
      description: 'Set up Passport with JWT strategy, refresh token rotation, and HTTP-only cookies',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      storyPoints: 8,
      assigneeId: john.id,
      reporterId: admin.id,
      sprintId: sprint1.id,
      completedAt: new Date('2026-09-06'),
    },
    {
      taskNumber: 3,
      title: 'Create Next.js frontend with Tailwind CSS',
      description: 'Scaffold Next.js 15 app with App Router, Tailwind CSS v4, and shadcn/ui',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      storyPoints: 3,
      assigneeId: jane.id,
      reporterId: admin.id,
      sprintId: sprint1.id,
      completedAt: new Date('2026-09-04'),
    },
    {
      taskNumber: 4,
      title: 'Build dashboard layout with sidebar',
      description: 'Create responsive sidebar navigation, header with user menu, and main content area',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      storyPoints: 5,
      assigneeId: jane.id,
      reporterId: admin.id,
      sprintId: sprint1.id,
      completedAt: new Date('2026-09-10'),
    },
    {
      taskNumber: 5,
      title: 'Implement server-side data table',
      description: 'Create reusable DataTable component with TanStack Table v8, server-side pagination, multi-column sorting, and column visibility',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      storyPoints: 13,
      assigneeId: jane.id,
      reporterId: admin.id,
      sprintId: sprint2.id,
    },
    {
      taskNumber: 6,
      title: 'Add multi-filter panel for tasks',
      description: 'Implement filter panel with status, priority, assignee, label, and date range filters',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      storyPoints: 8,
      assigneeId: john.id,
      reporterId: admin.id,
      sprintId: sprint2.id,
    },
    {
      taskNumber: 7,
      title: 'Task CRUD endpoints with validation',
      description: 'Build complete task API with create, read, update, soft delete, and restore',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      storyPoints: 8,
      assigneeId: john.id,
      reporterId: admin.id,
      sprintId: sprint2.id,
    },
    {
      taskNumber: 8,
      title: 'Dark mode implementation',
      description: 'Add theme switching with next-themes, update all components for dark mode support',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      storyPoints: 5,
      assigneeId: jane.id,
      reporterId: admin.id,
      sprintId: sprint2.id,
    },
    {
      taskNumber: 9,
      title: 'Kanban board with drag and drop',
      description: 'Build Kanban board using @dnd-kit with column-based task cards and real-time reordering',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.HIGH,
      storyPoints: 13,
      assigneeId: null,
      reporterId: admin.id,
      sprintId: sprint3.id,
    },
    {
      taskNumber: 10,
      title: 'Sprint planning view',
      description: 'Two-pane view: backlog ↔ sprint with drag to assign tasks and capacity tracking',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.MEDIUM,
      storyPoints: 8,
      assigneeId: null,
      reporterId: admin.id,
      sprintId: sprint3.id,
    },
    {
      taskNumber: 11,
      title: 'CSV/Excel import system',
      description: 'File upload with column mapping, BullMQ background processing, and real-time progress',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.LOW,
      storyPoints: 13,
      assigneeId: null,
      reporterId: admin.id,
      sprintId: null,
    },
    {
      taskNumber: 12,
      title: 'Analytics dashboard with charts',
      description: 'KPI cards, velocity chart, status distribution, burndown chart using Recharts',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.MEDIUM,
      storyPoints: 8,
      assigneeId: null,
      reporterId: admin.id,
      sprintId: null,
    },
    {
      taskNumber: 13,
      title: 'Fix login page form validation',
      description: 'Email validation not showing error messages correctly on blur',
      status: TaskStatus.TODO,
      priority: TaskPriority.URGENT,
      storyPoints: 2,
      assigneeId: jane.id,
      reporterId: john.id,
      sprintId: sprint2.id,
    },
    {
      taskNumber: 14,
      title: 'WebSocket notification system',
      description: 'Real-time notifications using Socket.IO gateway with NestJS',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.MEDIUM,
      storyPoints: 8,
      assigneeId: null,
      reporterId: admin.id,
      sprintId: null,
    },
    {
      taskNumber: 15,
      title: 'File attachment support with MinIO',
      description: 'S3-compatible file upload for task attachments with drag & drop UI',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.LOW,
      storyPoints: 5,
      assigneeId: null,
      reporterId: admin.id,
      sprintId: null,
    },
  ];

  for (const task of taskData) {
    await prisma.task.create({
      data: {
        ...task,
        projectId: project1.id,
      },
    });
  }

  // Add some labels to tasks
  const tasks = await prisma.task.findMany({
    where: { projectId: project1.id },
    orderBy: { taskNumber: 'asc' },
  });

  const labelAssignments = [
    { taskIndex: 0, labelName: 'Feature' },
    { taskIndex: 1, labelName: 'Feature' },
    { taskIndex: 2, labelName: 'Feature' },
    { taskIndex: 3, labelName: 'Design' },
    { taskIndex: 4, labelName: 'Feature' },
    { taskIndex: 5, labelName: 'Enhancement' },
    { taskIndex: 6, labelName: 'Feature' },
    { taskIndex: 7, labelName: 'Design' },
    { taskIndex: 8, labelName: 'Feature' },
    { taskIndex: 9, labelName: 'Feature' },
    { taskIndex: 10, labelName: 'Feature' },
    { taskIndex: 11, labelName: 'Enhancement' },
    { taskIndex: 12, labelName: 'Bug' },
    { taskIndex: 13, labelName: 'Feature' },
    { taskIndex: 14, labelName: 'Feature' },
  ];

  for (const assignment of labelAssignments) {
    const task = tasks[assignment.taskIndex];
    const label = labels[assignment.labelName];
    if (task && label) {
      await prisma.taskLabel.create({
        data: {
          taskId: task.id,
          labelId: label.id,
        },
      });
    }
  }

  console.log('  ✅ Tasks & label assignments created');

  // ─── Comments ──────────────────────────────────────────────
  if (tasks[4]) {
    await prisma.comment.createMany({
      data: [
        {
          content: 'Started working on the DataTable component. Using TanStack Table v8 for headless table logic.',
          taskId: tasks[4].id,
          authorId: jane.id,
        },
        {
          content: 'Make sure to implement column visibility toggle — it\'s a key portfolio feature.',
          taskId: tasks[4].id,
          authorId: admin.id,
        },
        {
          content: 'Good progress! The pagination is working with server-side data. Working on sorting next.',
          taskId: tasks[4].id,
          authorId: jane.id,
        },
      ],
    });
  }

  console.log('  ✅ Comments created');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
