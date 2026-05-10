import { ConversationRepository } from "../repositories/conversation.repository.js";
import { MessageRepository } from "../repositories/message.repository.js";
import { TOKEN_BUDGET_THRESHOLD } from "../config/env.js";
import type { Database } from "../config/database.js";
import type { Conversation, Message } from "@habit-tracker/shared";

function toConversationResponse(row: {
  id: string;
  userId: string;
  date: string;
  startedAt: Date;
  endedAt: Date | null;
  tokenCount: number;
}): Conversation {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    tokenCount: row.tokenCount,
  };
}

function toMessageResponse(row: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
}): Message {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as "user" | "assistant",
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export class ConversationService {
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;

  constructor(db: Database) {
    this.conversationRepo = new ConversationRepository(db);
    this.messageRepo = new MessageRepository(db);
  }

  async create(userId: string, date: string): Promise<Conversation> {
    const active = await this.conversationRepo.findActive(userId);
    if (active) {
      await this.conversationRepo.wrap(active.id);
    }

    const conversation = await this.conversationRepo.create({ userId, date });
    return toConversationResponse(conversation);
  }

  async getActive(userId: string): Promise<Conversation> {
    const active = await this.conversationRepo.findActive(userId);
    if (!active) {
      throw new ConversationError("No active conversation", 404);
    }
    return toConversationResponse(active);
  }

  async getMessages(userId: string, conversationId: string): Promise<Message[]> {
    const conversation = await this.conversationRepo.findByIdAndUser(
      conversationId,
      userId
    );
    if (!conversation) {
      throw new ConversationError("Conversation not found", 404);
    }

    const rows = await this.messageRepo.listByConversation(conversationId);
    return rows.map(toMessageResponse);
  }

  async addMessage(
    userId: string,
    conversationId: string,
    data: { content: string; role: string; tokenCount?: number }
  ): Promise<{ message: Message; conversation: Conversation }> {
    const conversation = await this.conversationRepo.findByIdAndUser(
      conversationId,
      userId
    );
    if (!conversation) {
      throw new ConversationError("Conversation not found", 404);
    }
    if (conversation.endedAt) {
      throw new ConversationError("Conversation already wrapped", 400);
    }

    const message = await this.messageRepo.create({
      conversationId,
      role: data.role,
      content: data.content,
    });

    let updatedConversation = conversation;
    if (data.tokenCount !== undefined && data.tokenCount > 0) {
      const newCount = conversation.tokenCount + data.tokenCount;
      updatedConversation = await this.conversationRepo.updateTokenCount(
        conversationId,
        newCount
      );

      if (newCount >= TOKEN_BUDGET_THRESHOLD) {
        updatedConversation = await this.conversationRepo.wrap(conversationId);
      }
    }

    return {
      message: toMessageResponse(message),
      conversation: toConversationResponse(updatedConversation),
    };
  }

  async wrap(userId: string, conversationId: string): Promise<Conversation> {
    const conversation = await this.conversationRepo.findByIdAndUser(
      conversationId,
      userId
    );
    if (!conversation) {
      throw new ConversationError("Conversation not found", 404);
    }
    if (conversation.endedAt) {
      throw new ConversationError("Conversation already wrapped", 400);
    }

    const wrapped = await this.conversationRepo.wrap(conversationId);
    return toConversationResponse(wrapped);
  }
}

export class ConversationError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
