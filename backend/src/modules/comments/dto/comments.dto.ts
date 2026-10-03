import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Working on this fix now, will push in 10 minutes.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content!: string;
}
