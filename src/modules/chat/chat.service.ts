import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessageEntity } from '../../entities/chat-message.entity';
import {
  PatientMessageChannel,
  PatientMessageDirection,
  PatientMessageEntity,
} from '../../entities/patient-message.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  ChatMessageSummary,
  ChatUserSummary,
  ConversationSummary,
  PatientMessageSummary,
} from './types/chat.types';
import { PaginatedResult } from './types/paginated-result.type';

const PREVIEW_LENGTH = 80;

export interface LogPatientMessageInput {
  clinicId: string;
  patientId: string;
  channel: PatientMessageChannel;
  subject?: string | null;
  body: string;
  sentByUserId?: string | null;
}

export interface ReceivePatientMessageInput {
  clinicId: string;
  patientId: string;
  body: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly chatMessagesRepository: Repository<ChatMessageEntity>,
    @InjectRepository(PatientMessageEntity)
    private readonly patientMessagesRepository: Repository<PatientMessageEntity>,
    @InjectRepository(PatientEntity)
    private readonly patientsRepository: Repository<PatientEntity>,
  ) {}

  async listTeamMessages(
    clinicId: string,
    { page, limit }: PaginationQueryDto,
  ): Promise<PaginatedResult<ChatMessageSummary>> {
    const [entities, total] = await this.chatMessagesRepository.findAndCount({
      where: { clinicId },
      relations: { author: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: entities.map((entity) => this.toChatMessageSummary(entity)),
      total,
      page,
      limit,
    };
  }

  async sendTeamMessage(
    clinicId: string,
    authorId: string,
    body: string,
  ): Promise<ChatMessageSummary> {
    const saved = await this.chatMessagesRepository.save(
      this.chatMessagesRepository.create({ clinicId, authorId, body }),
    );

    const message = await this.chatMessagesRepository.findOne({
      where: { id: saved.id },
      relations: { author: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found after creation');
    }

    return this.toChatMessageSummary(message);
  }

  // Latest message per patient, most recently active first. Grouping is done
  // via Postgres DISTINCT ON, but pagination happens in memory — fine at the
  // scale of one clinic's message history, revisit if that stops being true.
  async listPatientConversations(
    clinicId: string,
    { page, limit }: PaginationQueryDto,
  ): Promise<PaginatedResult<ConversationSummary>> {
    const latestPerPatient = await this.patientMessagesRepository
      .createQueryBuilder('pm')
      .distinctOn(['pm.patientId'])
      .leftJoinAndSelect('pm.patient', 'patient')
      .where('pm.clinicId = :clinicId', { clinicId })
      .orderBy('pm.patientId')
      .addOrderBy('pm.createdAt', 'DESC')
      .getMany();

    const summaries: ConversationSummary[] = latestPerPatient
      .map((message): ConversationSummary => ({
        patientId: message.patientId,
        patientName: `${message.patient.firstName} ${message.patient.lastName}`,
        lastMessageAt: message.createdAt,
        lastMessageChannel: message.channel,
        lastMessageDirection: message.direction,
        lastMessagePreview: this.buildPreview(message.body),
      }))
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    const total = summaries.length;
    const start = (page - 1) * limit;
    const items = summaries.slice(start, start + limit);

    return { items, total, page, limit };
  }

  async listPatientMessages(
    clinicId: string,
    patientId: string,
    { page, limit }: PaginationQueryDto,
  ): Promise<PaginatedResult<PatientMessageSummary>> {
    const [entities, total] = await this.patientMessagesRepository.findAndCount(
      {
        where: { clinicId, patientId },
        relations: { sentBy: true },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      },
    );

    return {
      items: entities.map((entity) => this.toPatientMessageSummary(entity)),
      total,
      page,
      limit,
    };
  }

  // Fire-and-forget: a logging failure must never break the actual send that
  // already succeeded, so this swallows errors and just logs a warning.
  async logPatientMessage(input: LogPatientMessageInput): Promise<void> {
    try {
      await this.patientMessagesRepository.save(
        this.patientMessagesRepository.create({
          clinicId: input.clinicId,
          patientId: input.patientId,
          channel: input.channel,
          subject: input.subject ?? null,
          body: input.body,
          sentByUserId: input.sentByUserId ?? null,
        }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to log patient message (clinicId=${input.clinicId}, patientId=${input.patientId}, channel=${input.channel}): ${reason}`,
      );
    }
  }

  // Patient-authored reply from the portal. Unlike logPatientMessage this
  // never swallows errors — it's the write the patient is waiting on, not a
  // best-effort log of a send that already succeeded elsewhere.
  async receivePatientMessage(
    input: ReceivePatientMessageInput,
  ): Promise<PatientMessageSummary> {
    const saved = await this.patientMessagesRepository.save(
      this.patientMessagesRepository.create({
        clinicId: input.clinicId,
        patientId: input.patientId,
        channel: PatientMessageChannel.PORTAL,
        direction: PatientMessageDirection.INBOUND,
        subject: null,
        body: input.body,
        sentByUserId: null,
      }),
    );

    return this.toPatientMessageSummary(saved);
  }

  // Inbound WhatsApp message from Meta's webhook (WhatsAppWebhookController).
  // `from` is the sender's wa_id (digits only, country code, no '+'); matched
  // against patient.phone with non-digit characters stripped since staff enter
  // phone numbers in inconsistent formats. Swallows errors like
  // logPatientMessage — Meta expects a 200 regardless, and retries the same
  // payload on a non-2xx, which would just duplicate the message.
  //
  // Caveat: WhatsApp is configured as a single number for the whole platform
  // (WHATSAPP_PHONE_NUMBER_ID is a global env var, not per-clinic), so if two
  // clinics share this deployment and both have a patient with the same
  // phone, the match is ambiguous — this picks the most recently created one.
  async receiveWhatsAppMessage(from: string, body: string): Promise<void> {
    try {
      const digits = from.replace(/[^\d]/g, '');
      const patient = await this.patientsRepository
        .createQueryBuilder('patient')
        .where("regexp_replace(patient.phone, '[^0-9]', '', 'g') = :digits", {
          digits,
        })
        .orderBy('patient.createdAt', 'DESC')
        .getOne();

      if (!patient) {
        this.logger.warn(
          `Received WhatsApp message from unknown number (from=${from})`,
        );
        return;
      }

      await this.patientMessagesRepository.save(
        this.patientMessagesRepository.create({
          clinicId: patient.clinicId,
          patientId: patient.id,
          channel: PatientMessageChannel.WHATSAPP,
          direction: PatientMessageDirection.INBOUND,
          subject: null,
          body,
          sentByUserId: null,
        }),
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to store inbound WhatsApp message (from=${from}): ${reason}`,
      );
    }
  }

  private buildPreview(body: string): string {
    return body.length > PREVIEW_LENGTH
      ? `${body.slice(0, PREVIEW_LENGTH)}…`
      : body;
  }

  // Entities carry the full UserEntity relation (password hash included) —
  // never return that as-is, always narrow to this shape first.
  private toUserSummary(user: {
    id: string;
    firstName: string;
    lastName: string;
  }): ChatUserSummary {
    return { id: user.id, firstName: user.firstName, lastName: user.lastName };
  }

  private toChatMessageSummary(entity: ChatMessageEntity): ChatMessageSummary {
    return {
      id: entity.id,
      body: entity.body,
      createdAt: entity.createdAt,
      author: this.toUserSummary(entity.author),
    };
  }

  private toPatientMessageSummary(
    entity: PatientMessageEntity,
  ): PatientMessageSummary {
    return {
      id: entity.id,
      channel: entity.channel,
      direction: entity.direction,
      subject: entity.subject,
      body: entity.body,
      createdAt: entity.createdAt,
      sentBy: entity.sentBy ? this.toUserSummary(entity.sentBy) : null,
    };
  }
}
