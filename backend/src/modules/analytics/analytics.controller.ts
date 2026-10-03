import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service.js';
import { CurrentUser } from '../../common/decorators/index.js';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard KPI data' })
  getDashboard(@CurrentUser() user: { id: string }) {
    return this.analyticsService.getDashboardKpis(user.id);
  }

  @Get('status-distribution')
  @ApiOperation({ summary: 'Task count by status' })
  getStatusDistribution() {
    return this.analyticsService.getStatusDistribution();
  }

  @Get('priority-distribution')
  @ApiOperation({ summary: 'Task count by priority' })
  getPriorityDistribution() {
    return this.analyticsService.getPriorityDistribution();
  }

  @Get('velocity')
  @ApiOperation({ summary: 'Sprint velocity data' })
  getVelocity() {
    return this.analyticsService.getSprintVelocity();
  }

  @Get('member-workload')
  @ApiOperation({ summary: 'Task distribution per team member' })
  getMemberWorkload() {
    return this.analyticsService.getMemberWorkload();
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Recent audit log activity' })
  getRecentActivity(@Query('limit') limit?: string) {
    return this.analyticsService.getRecentActivity(limit ? parseInt(limit, 10) : 20);
  }

  @Get('completion-trend')
  @ApiOperation({ summary: 'Tasks completed per day (last 30 days)' })
  getCompletionTrend() {
    return this.analyticsService.getCompletionTrend();
  }
}
