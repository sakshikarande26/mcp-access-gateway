/**
 * Gateway entrypoint: load config, build the server, start listening.
 */
import { loadConfig } from './config/index.js';
import { buildServer } from './server/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = buildServer(config);

  try {
    await app.listen({ port: config.port, host: config.host });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown so Docker stop / Ctrl-C closes connections cleanly.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      app.log.info(`Received ${signal}, shutting down`);
      void app.close().then(() => process.exit(0));
    });
  }
}

void main();
