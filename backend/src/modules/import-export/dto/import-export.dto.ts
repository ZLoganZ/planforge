import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { toArray } from '../../../common/transformers/index.js';

export class StartImportDto {
  @ApiProperty({ description: 'Target Project ID' })
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}

export class ExportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  projectIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ isArray: true })
  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsString({ each: true })
  priorities?: string[];
}
