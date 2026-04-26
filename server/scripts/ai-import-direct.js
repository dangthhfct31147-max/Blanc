import 'dotenv/config';

const MAX_STDIN_BYTES = Number(process.env.AI_IMPORT_DIRECT_MAX_BYTES || 2_000_000);
const VERBOSE = process.env.AI_IMPORT_DIRECT_VERBOSE === '1';
const VALID_TYPES = new Set(['contest', 'scholarship', 'document', 'news', 'course']);
let dbModule;

if (!VERBOSE) {
  console.log = () => {};
  console.warn = () => {};
}

async function readStdinJson() {
  const chunks = [];
  let total = 0;

  for await (const chunk of process.stdin) {
    total += chunk.length;
    if (total > MAX_STDIN_BYTES) {
      throw Object.assign(new Error('Import payload is too large'), { status: 413 });
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    throw Object.assign(new Error('Missing import payload on stdin'), { status: 400 });
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Import payload must be valid JSON'), { status: 400 });
  }
}

function writeResult(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function main() {
  const payload = await readStdinJson();
  const { type, data } = payload || {};
  if (!VALID_TYPES.has(type)) {
    throw Object.assign(
      new Error(`Invalid or missing type. Must be one of: ${Array.from(VALID_TYPES).join(', ')}`),
      { status: 400 }
    );
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw Object.assign(new Error('Missing or invalid data object'), { status: 400 });
  }

  const importHandlers = await import('../lib/importHandlers.js');
  dbModule = await import('../lib/db.js');
  const { importContent } = importHandlers;
  const result = await importContent(type, data);
  writeResult({ ok: true, ...result });
}

main()
  .catch((error) => {
    writeResult({
      ok: false,
      error: error?.message || 'Direct database import failed',
      status: error?.status || 500,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await dbModule?.disconnectFromDatabase?.();
    } catch {
      // The import result has already been written; do not leak connection details.
    }
  });
