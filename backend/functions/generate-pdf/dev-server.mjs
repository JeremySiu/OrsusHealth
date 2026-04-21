import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { handler } from './handler.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendEnvPath = path.resolve(__dirname, '..', '..', '.env');

loadDotenv({ path: backendEnvPath });

const PORT = Number(process.env.PORT || 3001);

const server = http.createServer(async (req, res) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString('utf8');

  const event = {
    body,
    headers: req.headers,
    requestContext: {
      http: {
        method: req.method,
      },
    },
  };

  try {
    const result = await handler(event);
    const headers = result.headers || {};

    res.writeHead(result.statusCode || 200, headers);

    if (!result.body) {
      res.end();
      return;
    }

    if (result.isBase64Encoded) {
      res.end(Buffer.from(result.body, 'base64'));
      return;
    }

    res.end(result.body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Local PDF server failed', detail: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`PDF dev server listening on http://localhost:${PORT}`);
});
