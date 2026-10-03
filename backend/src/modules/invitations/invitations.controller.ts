import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { CurrentUser, Public } from '../../common/decorators/index.js';
import {
  AcceptInvitationDto,
  CreateInvitationDto,
} from './dto/invitations.dto.js';
import { InvitationsService } from './invitations.service.js';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({ summary: 'Send email invitation to join workspace' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInvitationDto
  ) {
    return this.invitationsService.create(userId, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Get()
  @ApiOperation({ summary: 'List all workspace invitations' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('workspaceId') workspaceId?: string
  ) {
    return this.invitationsService.findAll(userId, workspaceId);
  }

  @Public()
  @Get('validate')
  @ApiOperation({ summary: 'Validate an invitation token' })
  async validateToken(@Query('token') token: string) {
    return this.invitationsService.validateToken(token);
  }

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept invitation and register or join workspace' })
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.invitationsService.accept(dto);

    // Set refresh token in HTTP-only cookie like in auth.controller
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return result;
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/resend')
  @ApiOperation({ summary: 'Resend invitation email with refreshed token' })
  async resend(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.invitationsService.resend(id, userId);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Revoke/cancel invitation' })
  async revoke(@Param('id') id: string) {
    return this.invitationsService.revoke(id);
  }
}
