/**
 * lib/tiktok.ts — SIGI_STATE extractor with versioned parser + Zod + fallback
 */
import { z } from 'zod';

// Bump when parser logic changes — poller logs this for canary detection
export const PARSER_VERSION = '1.0.0-sigi-v1';

// ----- Zod schemas for SIGI_STATE (minimal viable, extend as needed) -----
export const SigiUserSchema = z.object({
  id: z.string(),
  uniqueId: z.string(), // handle without @
  nickname: z.string().optional(),
  avatarThumb: z.string().optional(),
  verified: z.boolean().optional(),
});

export const SigiVideoSchema = z.object({
  id: z.string().regex(/^\d{10,20}$/),
  desc: z.string().optional(), // caption
  createTime: z.number().optional(),
  video: z
    .object({
      id: z.string().optional(),
      cover: z.string().optional(),
      downloadAddr: z.string().optional(),
    })
    .passthrough()
    .optional(),
  stats: z
    .object({
      playCount: z.number().optional(),
      diggCount: z.number().optional(),
    })
    .passthrough()
    .optional(),
  author: z.string().optional(),
  authorUniqueId: z.string().optional(),
});

export const SigiStateSchema = z
  .object({
    UserModule: z.record(z.string(), SigiUserSchema).optional(),
    ItemModule: z.record(z.string(), SigiVideoSchema).optional(),
    UserPage: z
      .object({
        uniqueId: z.string().optional(),
        userId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type SigiState = z.infer<typeof SigiStateSchema>;
export type ParsedTikTokProfile = {
  handle: string;
  user: z.infer<typeof SigiUserSchema> | null;
  videos: Array<z.infer<typeof SigiVideoSchema>>;
  parserVersion: string;
  rawUserKey?: string;
};

// ----- SIGI_STATE extraction (versioned, handles multiple script layouts) -----
const SIGI_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: 'assignment',
    // <script id="SIGI_STATE" type="application/json"> {...} </script>
    regex: /<script[^>]*id=["']SIGI_STATE["'][^>]*>([\s\S]*?)<\/script>/i,
  },
  {
    name: 'window_store',
    regex: /window\._ROUTER_STORE\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
  },
  {
    name: 'sigi_json_parse',
    // JSON.parse("...") sometimes escaped
    regex: /SIGI_STATE[^<]*?(\{&quot;UserModule[\s\S]*?\})/,
  },
];

export function extractSIGI(html: string): { raw: string; pattern: string } | null {
  for (const p of SIGI_PATTERNS) {
    const m = html.match(p.regex);
    if (m && m[1]) {
      let raw = m[1].trim();
      // Unescape HTML entities / JS string escapes that TikTok sometimes uses
      if (raw.includes('&quot;')) raw = raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      // If double-escaped JSON string, unwrap one layer
      if (raw.startsWith('"') && raw.endsWith('"')) {
        try {
          raw = JSON.parse(raw);
        } catch {
          // keep as-is
        }
      }
      return { raw, pattern: p.name };
    }
  }
  return null;
}

export function parseSigiState(raw: string): SigiState {
  const json = JSON.parse(raw);
  // TikTok nests SIGI_STATE under different roots depending on route
  // Common: { UserModule: {...}, ItemModule: {...} }  or  { scope: { UserModule ...}}
  const candidate = json.UserModule || json.ItemModule ? json : json.SIGI_STATE || json.scope || json;
  const parsed = SigiStateSchema.parse(candidate);
  return parsed;
}

export function toParsedProfile(handle: string, state: SigiState): ParsedTikTokProfile {
  const normalizedHandle = handle.replace(/^@/, '').toLowerCase();

  let user: ParsedTikTokProfile['user'] = null;
  let rawUserKey: string | undefined;

  if (state.UserModule) {
    // UserModule is keyed by userId or handle
    for (const [k, v] of Object.entries(state.UserModule)) {
      if (v.uniqueId?.toLowerCase() === normalizedHandle) {
        user = v;
        rawUserKey = k;
        break;
      }
    }
    // fallback: first entry if handle not matched (single-user page)
    if (!user) {
      const first = Object.entries(state.UserModule)[0];
      if (first) {
        user = first[1];
        rawUserKey = first[0];
      }
    }
  }

  const videos: ParsedTikTokProfile['videos'] = [];
  if (state.ItemModule) {
    for (const v of Object.values(state.ItemModule)) {
      // Only keep videos by this handle (filter reposts/duets if author present)
      if (v.authorUniqueId && v.authorUniqueId.toLowerCase() !== normalizedHandle) continue;
      videos.push(v);
    }
  }

  // Sort newest first if createTime present
  videos.sort((a, b) => (b.createTime ?? 0) - (a.createTime ?? 0));

  return { handle: normalizedHandle, user, videos, parserVersion: PARSER_VERSION, rawUserKey };
}

// ----- UA rotation (WAF mitigation) -----
const UA_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
];

function randomUA(): string {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

// ----- High-level fetch + parse (SIGI) with fallback hook -----
export type FetchTikTokResult =
  | { ok: true; profile: ParsedTikTokProfile; pattern: string }
  | { ok: false; reason: string; pattern?: string; rawSnippet?: string };

export async function fetchTikTokProfileViaSigi(handle: string): Promise<FetchTikTokResult> {
  const clean = handle.replace(/^@/, '');
  const url = `https://www.tiktok.com/@${encodeURIComponent(clean)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': randomUA(),
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.tiktok.com/',
    },
    // Do not cache at fetch layer; Vercel fetch cache would mask canary failures
    cache: 'no-store',
    // 10s timeout via AbortSignal
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 429) return { ok: false, reason: 'tiktok_429' };
  if (!res.ok) return { ok: false, reason: `tiktok_http_${res.status}` };

  const html = await res.text();

  const extracted = extractSIGI(html);
  if (!extracted) {
    return { ok: false, reason: 'sigi_not_found', rawSnippet: html.slice(0, 1200) };
  }

  try {
    const state = parseSigiState(extracted.raw);
    const profile = toParsedProfile(clean, state);
    if (!profile.user && profile.videos.length === 0) {
      return { ok: false, reason: 'sigi_empty', pattern: extracted.pattern, rawSnippet: extracted.raw.slice(0, 1200) };
    }
    return { ok: true, profile, pattern: extracted.pattern };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `sigi_parse_error:${msg.slice(0, 200)}`, pattern: extracted.pattern, rawSnippet: extracted.raw.slice(0, 1200) };
  }
}

// Fallback: TikTok Display API (requires tiktok_tokens row). Caller supplies accessToken.
export async function fetchVideosViaDisplayAPI(accessToken: string, openId: string): Promise<FetchTikTokResult> {
  // TikTok Display API: POST https://open.tiktokapis.com/v2/video/list/
  // Docs: https://developers.tiktok.com/doc/tiktok-api-reference/video-list/
  try {
    const res = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,cover_image_url,share_url,video_description', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20 }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const json: any = await res.json();
    if (!res.ok || json.error?.code !== 'ok') {
      return { ok: false, reason: `display_api_error:${json.error?.message || res.status}` };
    }
    const videos = (json.data?.videos || []).map((v: any) => ({
      id: String(v.id),
      desc: v.video_description || '',
      createTime: v.create_time,
      video: { cover: v.cover_image_url },
      authorUniqueId: openId,
    }));
    return {
      ok: true,
      profile: {
        handle: openId,
        user: null,
        videos,
        parserVersion: `${PARSER_VERSION}+display-api`,
      },
      pattern: 'display_api',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `display_api_fetch_error:${msg.slice(0, 200)}` };
  }
}
