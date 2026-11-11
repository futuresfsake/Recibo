import { createApp } from "./app.js";
import { createDbCheck } from "./checks/db.js";
import { createOllamaCheck } from "./checks/ollama.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp(config, {
  checkDb: createDbCheck(config),
  checkOllama: createOllamaCheck(config),
});

app.listen(config.port, () => {
  // Metadata only. Never log resume or job-post text (NFR-10).
  console.log(`resibo api listening on :${config.port}`);
});
