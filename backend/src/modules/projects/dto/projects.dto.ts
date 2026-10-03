import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryProjectsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workspaceId?: string;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'PlanForge Platform' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'PF' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  key!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}

export class AddProjectMemberDto {
  @ApiProperty({ example: 'jane@planforge.dev' })
  @IsString()
  @IsNotEmpty()
  userIdOrEmail!: string;

  @ApiProperty({ enum: Role, default: Role.MEMBER })
  @IsEnum(Role)
  role!: Role;
}

export class UpdateProjectMemberDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}

