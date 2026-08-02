import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageEntity } from '../../entities/chat-message.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { PatientMessageEntity } from '../../entities/patient-message.entity';
import { UserEntity } from '../../entities/user.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatMessageEntity,
      PatientMessageEntity,
      PatientEntity,
      UserEntity,
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
