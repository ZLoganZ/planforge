import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { enrichAuditLogs } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard KPIs ─────────────────────────────────────────
  async getDashboardKpis(userId: string) {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalTasks,
      inProgress,
      completedThisWeek,
      overdue,
      totalProjects,
      totalMembers,
    ] = await Promise.all([
      this.prisma.task.count({
        where: { deletedAt: null },
      }),
      this.prisma.task.count({
        where: { status: 'IN_PROGRESS', deletedAt: null },
      }),
      this.prisma.task.count({
        where: {
          status: 'DONE',
          completedAt: { gte: weekAgo },
          deletedAt: null,
        },
      }),
      this.prisma.task.count({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['DONE', 'CANCELLED'] },
          deletedAt: null,
        },
      }),
      this.prisma.project.count(),
      this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
    ]);

    // My tasks (assigned to current user)
    const myTasks = await this.prisma.task.count({
      where: {
        assigneeId: userId,
        status: { notIn: ['DONE', 'CANCELLED'] },
        deletedAt: null,
      },
    });

    // Tasks created this week
    const createdThisWeek = await this.prisma.task.count({
      where: { createdAt: { gte: weekAgo }, deletedAt: null },
    });

    return {
      totalTasks,
      inProgress,
      completedThisWeek,
      overdue,
      totalProjects,
      totalMembers,
      myTasks,
      createdThisWeek,
    };
  }

  // ─── Status Distribution ────────────────────────────────────
  async getStatusDistribution() {
    const results = await this.prisma.task.groupBy({
      by: ['status'],
      _count: { id: true },
      where: { deletedAt: null },
    });

    const statusLabels: Record<string, string> = {
      BACKLOG: 'Backlog',
      TODO: 'To Do',
      IN_PROGRESS: 'In Progress',
      IN_REVIEW: 'In Review',
      DONE: 'Done',
      CANCELLED: 'Cancelled',
    };

    const statusColors: Record<string, string> = {
      BACKLOG: '#94a3b8',
      TODO: '#3b82f6',
      IN_PROGRESS: '#f59e0b',
      IN_REVIEW: '#a855f7',
      DONE: '#10b981',
      CANCELLED: '#ef4444',
    };

    return results.map((r) => ({
      status: r.status,
      label: statusLabels[r.status] || r.status,
      count: r._count.id,
      color: statusColors[r.status] || '#94a3b8',
    }));
  }

  // ─── Priority Distribution ──────────────────────────────────
  async getPriorityDistribution() {
    const results = await this.prisma.task.groupBy({
      by: ['priority'],
      _count: { id: true },
      where: { deletedAt: null },
    });

    const priorityLabels: Record<string, string> = {
      URGENT: 'Urgent',
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low',
      NONE: 'None',
    };

    const priorityColors: Record<string, string> = {
      URGENT: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#3b82f6',
      NONE: '#94a3b8',
    };

    return results.map((r) => ({
      priority: r.priority,
      label: priorityLabels[r.priority] || r.priority,
      count: r._count.id,
      color: priorityColors[r.priority] || '#94a3b8',
    }));
  }

  // ─── Sprint Velocity ────────────────────────────────────────
  async getSprintVelocity() {
    const sprints = await this.prisma.sprint.findMany({
      where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        tasks: {
          where: { deletedAt: null },
          select: {
            status: true,
            storyPoints: true,
          },
        },
      },
    });

    return sprints.map((sprint) => {
      const completed = sprint.tasks.filter((t) => t.status === 'DONE');
      const totalPoints = sprint.tasks.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0,
      );
      const completedPoints = completed.reduce(
        (sum, t) => sum + (t.storyPoints || 0),
        0,
      );

      return {
        name: sprint.name,
        status: sprint.status,
        totalTasks: sprint.tasks.length,
        completedTasks: completed.length,
        totalPoints,
        completedPoints,
      };
    });
  }

  // ─── Member Workload ────────────────────────────────────────
  async getMemberWorkload() {
    const members = await this.prisma.user.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        assignedTasks: {
          where: {
            deletedAt: null,
            status: { notIn: ['DONE', 'CANCELLED'] },
          },
          select: {
            id: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    return members
      .map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        avatarUrl: m.avatarUrl,
        totalTasks: m.assignedTasks.length,
        inProgress: m.assignedTasks.filter((t) => t.status === 'IN_PROGRESS')
          .length,
        todo: m.assignedTasks.filter((t) => t.status === 'TODO').length,
        backlog: m.assignedTasks.filter((t) => t.status === 'BACKLOG').length,
        inReview: m.assignedTasks.filter((t) => t.status === 'IN_REVIEW')
          .length,
        urgent: m.assignedTasks.filter((t) => t.priority === 'URGENT').length,
      }))
      .filter((m) => m.totalTasks > 0)
      .sort((a, b) => b.totalTasks - a.totalTasks);
  }

  // ─── Recent Activity ────────────────────────────────────────
  async getRecentActivity(limit = 20) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        diff: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return enrichAuditLogs(this.prisma, logs);
  }

  // ─── Tasks Completed Over Time (Last 30 days) ──────────────
  async getCompletionTrend() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const tasks = await this.prisma.task.findMany({
      where: {
        status: 'DONE',
        completedAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      select: { completedAt: true },
      orderBy: { completedAt: 'asc' },
    });

    // Group by date
    const dailyCounts: Record<string, number> = {};
    for (
      let d = new Date(thirtyDaysAgo);
      d <= now;
      d.setDate(d.getDate() + 1)
    ) {
      dailyCounts[d.toISOString().split('T')[0]] = 0;
    }

    tasks.forEach((t) => {
      if (t.completedAt) {
        const day = t.completedAt.toISOString().split('T')[0];
        if (day in dailyCounts) dailyCounts[day]++;
      }
    });

    return Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      completed: count,
    }));
  }

  // ─── Sprint Burndown ─────────────────────────────────────────
  async getSprintBurndown(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            storyPoints: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    const totalPoints = sprint.tasks.reduce(
      (acc, t) => acc + (t.storyPoints && t.storyPoints > 0 ? t.storyPoints : 1),
      0
    );

    const completedTasks = sprint.tasks.filter((t) => t.status === 'DONE');
    const completedPoints = completedTasks.reduce(
      (acc, t) => acc + (t.storyPoints && t.storyPoints > 0 ? t.storyPoints : 1),
      0
    );
    const remainingPoints = Math.max(0, totalPoints - completedPoints);

    const now = new Date();
    const startDate = sprint.startDate
      ? new Date(sprint.startDate)
      : new Date(sprint.createdAt);

    // If an active sprint starts in the future due to timezone difference, align with now
    if (sprint.status === 'ACTIVE' && startDate > now) {
      startDate.setTime(now.getTime());
    }
    startDate.setUTCHours(0, 0, 0, 0);

    const plannedEndDate = sprint.endDate
      ? new Date(sprint.endDate)
      : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    plannedEndDate.setUTCHours(0, 0, 0, 0);

    const chartEndDate = new Date(plannedEndDate);
    if (sprint.status === 'ACTIVE' && now > plannedEndDate) {
      chartEndDate.setTime(now.getTime());
      chartEndDate.setUTCHours(0, 0, 0, 0);
    }

    const endOfToday = new Date(now);
    endOfToday.setUTCHours(23, 59, 59, 999);

    const totalDays = Math.max(
      1,
      Math.round((chartEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const plannedDays = Math.max(
      1,
      Math.round((plannedEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const daysData = [];

    for (let i = 0; i <= totalDays; i++) {
      const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = currentDate.toISOString().split('T')[0];
      const endOfDay = new Date(currentDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Ideal linear descent from totalPoints to 0 over the planned sprint days
      const idealRemaining = Math.max(
        0,
        Math.round(totalPoints - (Math.min(i, plannedDays) / plannedDays) * totalPoints)
      );

      // Determine if this day is past or today
      let isPastOrToday = false;
      if (sprint.status === 'COMPLETED') {
        isPastOrToday = true;
      } else if (sprint.status === 'ACTIVE') {
        isPastOrToday = i === 0 || endOfDay <= endOfToday || currentDate <= now;
      } else {
        isPastOrToday = i === 0;
      }

      let actualRemaining: number | null = null;
      let completedToDate = 0;

      if (isPastOrToday) {
        const completedTasksForDay = sprint.tasks.filter((t) => {
          if (t.status !== 'DONE') return false;

          const compDate = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt);

          // In completed sprint, by the final day, all completed tasks are burned down
          if (sprint.status === 'COMPLETED' && i === totalDays) {
            return true;
          }
          // In active sprint, today reflects all tasks completed so far
          if (sprint.status === 'ACTIVE' && endOfDay >= endOfToday) {
            return true;
          }
          return compDate <= endOfDay;
        });

        completedToDate = completedTasksForDay.reduce(
          (acc, t) => acc + (t.storyPoints && t.storyPoints > 0 ? t.storyPoints : 1),
          0
        );

        actualRemaining = Math.max(0, totalPoints - completedToDate);
      }

      daysData.push({
        dayIndex: i,
        dayLabel: `Day ${i + 1}`,
        date: dateStr,
        ideal: idealRemaining,
        actual: actualRemaining,
        completedToDate,
      });
    }

    return {
      sprint: {
        id: sprint.id,
        name: sprint.name,
        status: sprint.status,
        totalPoints,
        completedPoints,
        remainingPoints,
        totalTasks: sprint.tasks.length,
        completedTasks: completedTasks.length,
        startDate: startDate.toISOString(),
        endDate: plannedEndDate.toISOString(),
      },
      points: daysData,
    };
  }
}
