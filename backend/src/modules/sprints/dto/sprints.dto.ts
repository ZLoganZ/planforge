import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SprintStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class QuerySprintsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ enum: SprintStatus })
  @IsOptional()
  @IsEnum(SprintStatus)
  status?: SprintStatus;
}

export class CreateSprintDto {
  @ApiProperty({ example: 'Sprint 4 — Performance' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'Improve board rendering speed and optimize queries',
  })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: 'uuid-project-id' })
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}

export class UpdateSprintDto {
  @ApiPropertyOptional({ example: 'Sprint 4 — Performance' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Improve board rendering speed and optimize queries',
  })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ enum: SprintStatus })
  @IsOptional()
  @IsEnum(SprintStatus)
  status?: SprintStatus;

  @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
