import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplateEntity } from '../../entities/email-template.entity';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplateEntity)
    private readonly templatesRepository: Repository<EmailTemplateEntity>,
  ) {}

  findAll(clinicId: string): Promise<EmailTemplateEntity[]> {
    return this.templatesRepository.find({
      where: { clinicId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(clinicId: string, id: string): Promise<EmailTemplateEntity> {
    const template = await this.templatesRepository.findOne({
      where: { id, clinicId },
    });

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return template;
  }

  create(
    clinicId: string,
    dto: CreateEmailTemplateDto,
  ): Promise<EmailTemplateEntity> {
    const template = this.templatesRepository.create({ ...dto, clinicId });
    return this.templatesRepository.save(template);
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplateEntity> {
    const template = await this.findOne(clinicId, id);
    this.templatesRepository.merge(template, dto);
    return this.templatesRepository.save(template);
  }

  async remove(clinicId: string, id: string): Promise<void> {
    const template = await this.findOne(clinicId, id);
    await this.templatesRepository.softRemove(template);
  }
}
