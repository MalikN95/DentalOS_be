import {
  PatientMessageChannel,
  PatientMessageDirection,
} from '../../../entities/patient-message.entity';

export interface ConversationSummary {
  patientId: string;
  patientName: string;
  lastMessageAt: Date;
  lastMessageChannel: PatientMessageChannel;
  lastMessageDirection: PatientMessageDirection;
  lastMessagePreview: string;
}

export interface ChatUserSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ChatMessageSummary {
  id: string;
  body: string;
  createdAt: Date;
  author: ChatUserSummary;
}

export interface PatientMessageSummary {
  id: string;
  channel: PatientMessageChannel;
  direction: PatientMessageDirection;
  subject: string | null;
  body: string;
  createdAt: Date;
  sentBy: ChatUserSummary | null;
}
