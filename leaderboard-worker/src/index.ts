const ALLOWED_ORIGINS = new Set([
  "https://eric3uy51752i6.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

const ADJECTIVES = new Set([
  "BRAVE", "WOBBLY", "SNEAKY", "LUCKY", "NERVOUS", "BOLD",
  "QUICK", "JELLY", "TINY", "CHAOTIC", "SPEEDY", "STUBBORN",
]);

const NOUNS = new Set([
  "BLOB", "JUMPER", "PANIC", "ROOKIE", "RUNNER", "LEGEND",
  "BEAN", "WIGGLE", "SPARK", "SQUISH", "TRICKSTER", "HERO",
]);

const DAILY_NAMES = [
  "THE FLOOR IS FINE",
  "TRUST ISSUES",
  "SPIKE DELIVERY",
  "GRAVITY TOOK OFF",
  "LOOK BEFORE YOU TAP",
  "DEFINITELY SAFE",
  "ONE SMALL PROBLEM",
  "NOTHING SUSPICIOUS",
  "THE LONG WAY DOWN",
  "A PERFECTLY NORMAL LEVEL",
];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    challenge_date TEXT NOT NULL,
    player_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 100),
    deaths INTEGER NOT NULL CHECK (deaths BETWEEN 0 AND 9999),
    time_ms INTEGER NOT NULL CHECK (time_ms BETWEEN 500 AND 3600000),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (challenge_date, player_id)
  ) STRICT`,
  `CREATE INDEX IF NOT EXISTS idx_scores_daily_rank
    ON scores (challenge_date, deaths, time_ms, created_at)`,
  `CREATE TABLE IF NOT EXISTS rate_limits (
    key_hash TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (key_hash, window_start)
  ) STRICT`,
  `CREATE INDEX IF NOT EXISTS idx_rate_limits_window
    ON rate_limits (window_start)`,
] as const;

type LeaderboardRow = {
  playerName: string;
  level: number;
  deaths: number;
  timeMs: number;
  createdAt: string;
};

type ScoreInput = {
  challengeDate: string;
  playerId: string;
  playerName: string;
  level: number;
  deaths: number;
  timeMs: number;
};

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "Content-Type, X-Dont-Jump-Client",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function securityHeaders(): HeadersInit {
  return {
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function jsonResponse(
  data: unknown,
  status: number,
  origin: string | null,
  cacheControl = "no-store",
): Response {
  const headers = new Headers({
    "Cache-Control": cacheControl,
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(origin),
    ...securityHeaders(),
  });
  return new Response(JSON.stringify(data), { status, headers });
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function dailyChallenge(date = todayUtc()): { date: string; level: number; name: string } {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const level = ((dayNumber * 37) % 100) + 1;
  const name = DAILY_NAMES[dayNumber % DAILY_NAMES.length] ?? "DEFINITELY SAFE";
  return { date, level, name };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function validPlayerName(value: string): boolean {
  const match = /^(\w+) (\w+) (\d{2})$/.exec(value);
  return Boolean(match && match[1] && match[2] && ADJECTIVES.has(match[1]) && NOUNS.has(match[2]));
}

function validateScore(value: unknown): ScoreInput {
  if (!isRecord(value)) throw new HttpError(400, "Invalid score payload");

  const { challengeDate, playerId, playerName, level, deaths, timeMs } = value;
  if (challengeDate !== todayUtc()) throw new HttpError(400, "Only today's challenge accepts scores");
  if (typeof playerId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(playerId)) {
    throw new HttpError(400, "Invalid player identifier");
  }
  if (typeof playerName !== "string" || !validPlayerName(playerName)) {
    throw new HttpError(400, "Invalid player callsign");
  }
  if (!isIntegerInRange(level, 1, 100)) throw new HttpError(400, "Invalid level");
  if (!isIntegerInRange(deaths, 0, 9999)) throw new HttpError(400, "Invalid death count");
  if (!isIntegerInRange(timeMs, 500, 3_600_000)) throw new HttpError(400, "Invalid completion time");

  const challenge = dailyChallenge(challengeDate);
  if (level !== challenge.level) throw new HttpError(400, "That is not today's challenge level");

  return { challengeDate, playerId, playerName, level, deaths, timeMs };
}

async function readSmallJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > 2_048) {
    throw new HttpError(413, "Score payload is too large");
  }
  if (!request.body) throw new HttpError(400, "Missing score payload");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > 2_048) {
        await reader.cancel();
        throw new HttpError(413, "Score payload is too large");
      }
      chunks.push(value);
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new HttpError(400, "Score payload must be valid JSON");
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureSchema(db: D1Database): Promise<void> {
  await db.batch(SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
}

async function enforceSubmissionLimit(request: Request, input: ScoreInput, env: Env): Promise<void> {
  const minuteWindow = Math.floor(Date.now() / 60_000);
  const network = request.headers.get("CF-Connecting-IP") ?? "local";
  const keyHash = await sha256Hex(`${network}|${input.playerId}|${input.challengeDate}`);
  const count = await env.DB.prepare(`
    INSERT INTO rate_limits (key_hash, window_start, count)
    VALUES (?1, ?2, 1)
    ON CONFLICT (key_hash, window_start)
    DO UPDATE SET count = count + 1
    RETURNING count
  `).bind(keyHash, minuteWindow).first<number>("count");

  if (count !== null && count > 10) {
    throw new HttpError(429, "Too many score submissions. Try again in a minute.");
  }
}

async function getLeaderboard(
  db: Pick<D1Database, "prepare"> | Pick<D1DatabaseSession, "prepare">,
  date: string,
  limit = 10,
): Promise<LeaderboardRow[]> {
  const result = await db.prepare(`
    SELECT
      player_name AS playerName,
      level,
      deaths,
      time_ms AS timeMs,
      created_at AS createdAt
    FROM scores
    WHERE challenge_date = ?1
    ORDER BY deaths ASC, time_ms ASC, created_at ASC
    LIMIT ?2
  `).bind(date, limit).all<LeaderboardRow>();
  return result.results;
}

async function submitScore(request: Request, env: Env, ctx: ExecutionContext, origin: string | null): Promise<Response> {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) throw new HttpError(403, "This website is not allowed to submit scores");
  if (request.headers.get("X-Dont-Jump-Client") !== "web-v1") throw new HttpError(400, "Missing game client header");

  const input = validateScore(await readSmallJson(request));
  await enforceSubmissionLimit(request, input, env);

  const now = new Date().toISOString();
  const session = env.DB.withSession("first-primary");
  const writeResult = await session.prepare(`
    INSERT INTO scores (
      id, challenge_date, player_id, player_name, level, deaths, time_ms, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
    ON CONFLICT (challenge_date, player_id) DO UPDATE SET
      player_name = excluded.player_name,
      level = excluded.level,
      deaths = excluded.deaths,
      time_ms = excluded.time_ms,
      updated_at = excluded.updated_at
    WHERE excluded.deaths < scores.deaths
       OR (excluded.deaths = scores.deaths AND excluded.time_ms < scores.time_ms)
  `).bind(
    crypto.randomUUID(),
    input.challengeDate,
    input.playerId,
    input.playerName,
    input.level,
    input.deaths,
    input.timeMs,
    now,
  ).run();

  const leaderboard = await getLeaderboard(session, input.challengeDate);
  ctx.waitUntil(env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?1").bind(Math.floor(Date.now() / 60_000) - 2_880).run());
  console.log(JSON.stringify({
    message: "score processed",
    challengeDate: input.challengeDate,
    level: input.level,
    changed: writeResult.meta.changes,
  }));

  return jsonResponse({
    accepted: writeResult.meta.changes > 0,
    leaderboard: leaderboard.map((entry, index) => ({ rank: index + 1, ...entry })),
  }, 200, origin);
}

async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return jsonResponse({ error: "Origin not allowed" }, 403, origin);
    return new Response(null, { status: 204, headers: { ...corsHeaders(origin), ...securityHeaders() } });
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    await ensureSchema(env.DB);
    return jsonResponse({ ok: true, service: "dont-jump-leaderboard", version: 1 }, 200, origin);
  }

  if (request.method === "GET" && url.pathname === "/api/daily") {
    return jsonResponse({ challenge: dailyChallenge() }, 200, origin, "public, max-age=300");
  }

  if (request.method === "GET" && url.pathname === "/api/leaderboard") {
    const date = url.searchParams.get("date") ?? todayUtc();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Invalid leaderboard date");
    const leaderboard = await getLeaderboard(env.DB, date);
    return jsonResponse({
      date,
      leaderboard: leaderboard.map((entry, index) => ({ rank: index + 1, ...entry })),
      scorePolicy: "user-submitted",
    }, 200, origin, "public, max-age=20");
  }

  if (request.method === "POST" && url.pathname === "/api/scores") {
    return await submitScore(request, env, ctx, origin);
  }

  throw new HttpError(404, "Not found");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin");
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonResponse({ error: error.message }, error.status, origin);
      }
      console.error(JSON.stringify({
        message: "unhandled leaderboard error",
        error: error instanceof Error ? error.message : String(error),
        path: new URL(request.url).pathname,
      }));
      return jsonResponse({ error: "Internal server error" }, 500, origin);
    }
  },
} satisfies ExportedHandler<Env>;
