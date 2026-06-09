import { createServer } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createRealtimeServer } from "./realtime/socket.js";

const app = createApp();
const httpServer = createServer(app);

createRealtimeServer(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`LMS API listening on ${env.API_BASE_URL}`);
});
