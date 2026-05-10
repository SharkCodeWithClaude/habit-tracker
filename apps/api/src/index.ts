import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { getDb } from "./config/database.js";

const app = createApp(getDb());
const port = 4000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API server running on http://localhost:${info.port}`);
});
