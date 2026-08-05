import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

@Module({
  imports: [ChatModule],
  controllers: [WhatsAppWebhookController],
})
export class WhatsAppModule {}
