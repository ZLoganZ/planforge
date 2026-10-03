import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @ApiProperty({ example: 'Bug' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: '#ef4444' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  color!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId!: string;
}

export class UpdateLabelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;
}
