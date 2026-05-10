import { Hono } from "hono";
import {
  createConversationSchema,
  createMessageSchema,
} from "@habit-tracker/shared";
import {
  ConversationService,
  ConversationError,
} from "../services/conversation.service.js";
import { InferenceService } from "../services/inference.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import type { AuthEnv } from "../middleware/auth.middleware.js";
import type { Database } from "../config/database.js";

export function createConversationRoutes(db: Database) {
  const router = new Hono<AuthEnv>();
  const service = new ConversationService(db);
  const inferenceService = new InferenceService(db);

  router.use(authMiddleware);

  router.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        400
      );
    }

    const userId = c.get("userId");
    const conversation = await service.create(userId, parsed.data.date);
    return c.json({ conversation }, 201);
  });

  router.get("/active", async (c) => {
    const userId = c.get("userId");
    try {
      const conversation = await service.getActive(userId);
      return c.json({ conversation });
    } catch (e) {
      if (e instanceof ConversationError) {
        return c.json({ error: e.message }, e.status as 404);
      }
      throw e;
    }
  });

  router.get("/:id/messages", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("id");
    try {
      const messages = await service.getMessages(userId, conversationId);
      return c.json({ messages });
    } catch (e) {
      if (e instanceof ConversationError) {
        return c.json({ error: e.message }, e.status as 404);
      }
      throw e;
    }
  });

  router.post("/:id/messages", async (c) => {
    const body = await c.req.json();
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        400
      );
    }

    const userId = c.get("userId");
    const conversationId = c.req.param("id");

    try {
      const result = await service.addMessage(userId, conversationId, parsed.data);

      if (parsed.data.role === "user") {
        const conversation = result.conversation;
        const inference = await inferenceService.infer(
          userId,
          conversationId,
          conversation.date
        );
        return c.json({ ...result, proposals: inference.proposals }, 201);
      }

      return c.json(result, 201);
    } catch (e) {
      if (e instanceof ConversationError) {
        return c.json({ error: e.message }, e.status as 400 | 404);
      }
      throw e;
    }
  });

  router.post("/:id/wrap", async (c) => {
    const userId = c.get("userId");
    const conversationId = c.req.param("id");

    try {
      const conversation = await service.wrap(userId, conversationId);
      return c.json({ conversation });
    } catch (e) {
      if (e instanceof ConversationError) {
        return c.json({ error: e.message }, e.status as 400 | 404);
      }
      throw e;
    }
  });

  return router;
}
