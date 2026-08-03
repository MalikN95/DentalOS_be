import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ChatService } from './chat.service';
import { ListPatientMessagesQueryDto } from './dto/list-patient-messages-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import {
  ChatMessageSummary,
  ConversationSummary,
  PatientMessageSummary,
} from './types/chat.types';
import { PaginatedResult } from './types/paginated-result.type';

// Staff-only: the patient portal talks to /patient/messages instead
// (see PatientPortalController), never directly to this controller.
@ApiTags('chat')
@ApiBearerAuth()
@Roles(
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.DOCTOR,
  UserRole.RECEPTIONIST,
  UserRole.ASSISTANT,
  UserRole.ACCOUNTANT,
)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  listTeamMessages(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<ChatMessageSummary>> {
    return this.chatService.listTeamMessages(clinic.id, query);
  }

  @Post('messages')
  sendTeamMessage(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') authorId: string,
    @Body() dto: SendChatMessageDto,
  ): Promise<ChatMessageSummary> {
    return this.chatService.sendTeamMessage(clinic.id, authorId, dto.body);
  }

  @Get('patient-messages/conversations')
  listPatientConversations(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<ConversationSummary>> {
    return this.chatService.listPatientConversations(clinic.id, query);
  }

  @Get('patient-messages')
  listPatientMessages(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListPatientMessagesQueryDto,
  ): Promise<PaginatedResult<PatientMessageSummary>> {
    return this.chatService.listPatientMessages(
      clinic.id,
      query.patientId,
      query,
    );
  }
}
