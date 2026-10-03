import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { CreateLabelDto, UpdateLabelDto } from './dto/labels.dto.js';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLabelDto) {
    const existing = await this.prisma.label.findUnique({
      where: {
        projectId_name: {
          projectId: dto.projectId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Label "${dto.name}" already exists in this project`,
      );
    }

    return this.prisma.label.create({ data: dto });
  }

  async findAllByProject(projectId: string) {
    return this.prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateLabelDto) {
    const existing = await this.prisma.label.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Label not found');

    return this.prisma.label.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.label.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Label not found');

    await this.prisma.label.delete({ where: { id } });
    return { message: 'Label deleted' };
  }
}
