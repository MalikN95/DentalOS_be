import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  type RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ChatService } from '../chat/chat.service';
import {
  WhatsAppInboundMessage,
  WhatsAppWebhookPayload,
} from './whatsapp-webhook.types';

// Meta hits this controller directly (server-to-server) — no browser involved,
// so CORS is not a factor for either endpoint below.
@ApiExcludeController()
@Controller('whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly chatService: ChatService,
  ) {}

  // Meta calls this once, synchronously, when you click "Verify and Save" in
  // the App dashboard's webhook config screen.
  @Public()
  @Get('webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expectedToken = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');

    if (!expectedToken || mode !== 'subscribe' || token !== expectedToken) {
      throw new UnauthorizedException('Invalid webhook verification request');
    }

    return challenge;
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    this.verifySignature(request);

    const payload = request.body as WhatsAppWebhookPayload;
    const textMessages = (
      payload.entry?.flatMap((entry) =>
        entry.changes.flatMap((change) => change.value.messages ?? []),
      ) ?? []
    ).filter(
      (
        message,
      ): message is WhatsAppInboundMessage & { text: { body: string } } =>
        message.type === 'text' && !!message.text,
    );

    await Promise.all(
      textMessages.map((message) =>
        this.chatService.receiveWhatsAppMessage(
          message.from,
          message.text.body,
        ),
      ),
    );

    return { status: 'ok' };
  }

  // Verifies the X-Hub-Signature-256 header (HMAC-SHA256 of the raw body,
  // keyed with the Meta App Secret). Skipped with a logged warning if
  // WHATSAPP_APP_SECRET isn't set — same fail-open pattern WhatsAppSender uses
  // for optional config, fine for local dev, must be set in prod.
  private verifySignature(request: RawBodyRequest<Request>): void {
    const appSecret = this.config.get<string>('WHATSAPP_APP_SECRET');

    if (!appSecret) {
      this.logger.warn(
        'WHATSAPP_APP_SECRET is not set — skipping webhook signature verification',
      );
      return;
    }

    const signatureHeader = request.headers['x-hub-signature-256'];

    if (typeof signatureHeader !== 'string' || !request.rawBody) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const expected = `sha256=${createHmac('sha256', appSecret)
      .update(request.rawBody)
      .digest('hex')}`;
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signatureHeader);

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
