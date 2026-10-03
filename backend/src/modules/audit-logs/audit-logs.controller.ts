import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { Roles } from '../../common/decorators/index.js';
import { AuditLogsService } from './audit-logs.service.js';
import { QueryAuditLogsDto } from './dto/audit-logs.dto.js';

@ApiTags('Audit Logs')
@ApiBearerAuth('JWT-auth')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(Role.VIEWER)
  @ApiOperation({ summary: 'List audit logs with filtering and pagination' })
  findAll(@Query() query: QueryAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get('stats')
  @Roles(Role.VIEWER)
  @ApiOperation({ summary: 'Get summary statistics of audit logs' })
  getStats() {
    return this.auditLogsService.getStats();
  }
}
