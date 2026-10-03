import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/index.js';
import { PrismaService } from '../../database/prisma.service.js';

const ROLE_WEIGHT: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('Access denied: Authentication required');
    }

    // Determine user role: check if user.role exists, otherwise query workspace/project membership
    let effectiveRole: Role | null = user.role || null;

    if (!effectiveRole) {
      const workspaceId = request.params?.workspaceId || request.query?.workspaceId || request.body?.workspaceId;
      const projectId = request.params?.projectId || request.query?.projectId || request.body?.projectId;

      if (projectId) {
        const member = await this.prisma.projectMember.findUnique({
          where: {
            projectId_userId: { projectId, userId: user.id },
          },
          select: { role: true },
        });
        if (member) effectiveRole = member.role;
      }

      if (!effectiveRole && workspaceId) {
        const member = await this.prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: { workspaceId, userId: user.id },
          },
          select: { role: true },
        });
        if (member) effectiveRole = member.role;
      }

      // Fallback: check any workspace membership for the user
      if (!effectiveRole) {
        const member = await this.prisma.workspaceMember.findFirst({
          where: { userId: user.id },
          orderBy: { role: 'asc' }, // OWNER comes first in priority
          select: { role: true },
        });
        if (member) effectiveRole = member.role;
      }
    }

    if (!effectiveRole) {
      throw new ForbiddenException('Access denied: No role assigned in this scope');
    }

    // Role hierarchy evaluation: user has sufficient access if effectiveRole weight >= minimum required role weight
    const minRequiredWeight = Math.min(...requiredRoles.map((r) => ROLE_WEIGHT[r] ?? 1));
    const userWeight = ROLE_WEIGHT[effectiveRole] ?? 0;

    if (userWeight < minRequiredWeight) {
      throw new ForbiddenException(
        `Insufficient permissions. Requires: ${requiredRoles.join(' or ')} (Current: ${effectiveRole})`,
      );
    }

    request.userRole = effectiveRole;
    return true;
  }
}
