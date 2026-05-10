import { Hono } from "hono";
import { saveAiConfigSchema, aiProviderSchema } from "@habit-tracker/shared";
import { AiConfigService } from "../services/ai-config.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import type { AuthEnv } from "../middleware/auth.middleware.js";
import type { Database } from "../config/database.js";

export function createAiConfigRoutes(db: Database) {
  const router = new Hono<AuthEnv>();
  const service = new AiConfigService(db);

  router.use(authMiddleware);

  router.get("/", async (c) => {
    const userId = c.get("userId");
    const configs = await service.getConfigs(userId);
    return c.json({ configs });
  });

  router.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = saveAiConfigSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    const userId = c.get("userId");
    const { provider, apiKey, modelName } = parsed.data;
    const config = await service.saveConfig(userId, provider, apiKey, modelName);
    return c.json({ config });
  });

  router.delete("/:provider", async (c) => {
    const providerParam = c.req.param("provider");
    const parsed = aiProviderSchema.safeParse(providerParam);
    if (!parsed.success) {
      return c.json({ error: "Invalid provider" }, 400);
    }

    const userId = c.get("userId");
    const deleted = await service.deleteConfig(userId, parsed.data);
    if (!deleted) {
      return c.json({ error: "Config not found" }, 404);
    }
    return c.json({ deleted: true });
  });

  return router;
}
