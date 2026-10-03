import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class QueryTasksDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: TaskStatus, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskStatus, { each: true })
  @Type(() => String)
  statuses?: TaskStatus[];

  @ApiPropertyOptional({ enum: TaskPriority, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TaskPriority, { each: true })
  @Type(() => String)
  priorities?: TaskPriority[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  assignees?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  labels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string;
}

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, default: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  storyPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  storyPoints?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labelIds?: string[];
}

export class ReorderTaskItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  position!: number;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string | null;
}

export class ReorderTasksDto {
  @ApiProperty({ type: [ReorderTaskItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderTaskItemDto)
  items!: ReorderTaskItemDto[];
}

export class BulkUpdateTasksDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  taskIds!: string[];

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sprintId?: string | null;
}
