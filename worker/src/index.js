const MAX_BODY_LENGTH = 20000;
const SESSION_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 5;
const QUERY_WINDOW_SECONDS = 60 * 60;
const MAX_QUERY_SUBMISSIONS = 5;
const TOTP_STEP_SECONDS = 30;
const TOTP_WINDOW_STEPS = 1;
const TURNSTILE_ACTION = 'visitor_query';
const AUDIT_RETENTION_DAYS = 180;

function jsonResponse(data, status, origin, allowedOrigins) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000',
    'Vary': 'Origin'
  };
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

function parseCookies(request) {
  const cookies = {};
  (request.headers.get('Cookie') || '').split(';').forEach(function (part) {
    const separator = part.indexOf('=');
    if (separator > 0) {
      cookies[part.slice(0, separator).trim()] = part.slice(separator + 1).trim();
    }
  });
  return cookies;
}

function bytesToHex(bytes) {
  return Array.from(new Uint8Array(bytes)).map(function (value) {
    return value.toString(16).padStart(2, '0');
  }).join('');
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  return bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
}

function decodeBase32(value) {
  const normalized = value.toUpperCase().replace(/=+$/, '');
  if (!/^[A-Z2-7]+$/.test(normalized)) {
    throw new Error('ADMIN_TOTP_SECRET must be a Base32 value.');
  }
  let bits = '';
  for (const character of normalized) {
    bits += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(character).toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(parseInt(bits.slice(offset, offset + 8), 2));
  }
  if (bytes.length < 20) {
    throw new Error('ADMIN_TOTP_SECRET must decode to at least 20 bytes.');
  }
  return new Uint8Array(bytes);
}

async function totpCode(secret, counter) {
  const key = await crypto.subtle.importKey(
    'raw',
    decodeBase32(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const message = new ArrayBuffer(8);
  new DataView(message).setBigUint64(0, BigInt(counter));
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1000000).padStart(6, '0');
}

async function matchingTotpCounter(secret, code, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) {
    return null;
  }
  const currentCounter = Math.floor(now / 1000 / TOTP_STEP_SECONDS);
  for (let offset = -TOTP_WINDOW_STEPS; offset <= TOTP_WINDOW_STEPS; offset += 1) {
    const counter = currentCounter + offset;
    if (counter >= 0 && constantTimeEqual(await totpCode(secret, counter), code)) {
      return counter;
    }
  }
  return null;
}

function constantTimeEqual(left, right) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return difference === 0;
}

function createToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode.apply(null, bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function readJson(request) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > MAX_BODY_LENGTH) {
    return { error: 'Request is too large.' };
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_LENGTH) {
    return { error: 'Request is too large.' };
  }
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { error: 'Request must be a JSON object.' };
    }
    return { value };
  } catch {
    return { error: 'Request body must be valid JSON.' };
  }
}

async function verifyTurnstile(env, token, expectedHostname) {
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) {
    throw new Error('Turnstile is not configured.');
  }
  if (!token || token.length > 2048) {
    return false;
  }
  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET_KEY,
    response: token,
    idempotency_key: crypto.randomUUID()
  });
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) {
    throw new Error('Turnstile Siteverify returned HTTP ' + response.status + '.');
  }
  const result = await response.json();
  return result.success === true &&
    result.hostname === expectedHostname &&
    result.action === TURNSTILE_ACTION;
}

async function recordAuditEvent(env, eventType, resourceId = null) {
  await env.DB.prepare(
    'INSERT INTO security_audit_log (event_type, resource_id, created_at) VALUES (?, ?, ?)'
  ).bind(eventType, resourceId, new Date().toISOString()).run();
}

async function verifyRequestOrigin(request, origin, allowedOrigins) {
  if (!origin || !allowedOrigins.includes(origin)) {
    return false;
  }
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return false;
  }
  const contentType = request.headers.get('Content-Type') || '';
  return /^application\/json(?:\s*;|$)/i.test(contentType);
}

function normalizeField(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validQuery(payload) {
  const query = {
    name: normalizeField(payload.name),
    email: normalizeField(payload.email).toLowerCase(),
    subject: normalizeField(payload.subject),
    message: normalizeField(payload.message)
  };
  if (query.name.length < 2 || query.name.length > 100 || /[\r\n]/.test(query.name)) {
    return { error: 'Please enter a name up to 100 characters long.' };
  }
  if (
    query.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query.email)
  ) {
    return { error: 'Please enter a valid email address.' };
  }
  if (query.subject.length < 2 || query.subject.length > 160 || /[\r\n]/.test(query.subject)) {
    return { error: 'Please enter a subject up to 160 characters long.' };
  }
  if (query.message.length < 10 || query.message.length > 3000) {
    return { error: 'Your message must be between 10 and 3000 characters.' };
  }
  return { query };
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, function (character) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character];
  });
}

async function sendEmail(env, email) {
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    throw new Error('Email delivery is not configured.');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(email)
  });
  if (!response.ok) {
    let providerError = {};
    try {
      providerError = await response.json();
    } catch (error) {
      console.error('Email provider returned a non-JSON error response.');
    }
    const message = typeof providerError.message === 'string'
      ? providerError.message
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
        .slice(0, 300)
      : '';
    const code = typeof providerError.name === 'string'
      ? providerError.name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
      : '';
    console.error('Email provider rejected request:', {
      status: response.status,
      code: code || 'unknown',
      message: message
    });
    throw new Error(
      'Resend rejected the email (HTTP ' + response.status + ', ' +
      (code || 'unknown error') + '). Check the Worker logs for the sanitized provider reason.'
    );
  }
}

async function notifyOwner(env, query) {
  if (!env.ADMIN_EMAIL) {
    throw new Error('The inbox notification address is not configured.');
  }
  const safeMessage = escapeHtml(query.message).replace(/\n/g, '<br>');
  await sendEmail(env, {
    from: env.FROM_EMAIL,
    to: [env.ADMIN_EMAIL],
    reply_to: query.email,
    subject: 'New portfolio query: ' + query.subject,
    text: 'A visitor sent a private query.\n\nFrom: ' + query.name + ' <' + query.email +
      '>\nSubject: ' + query.subject + '\n\n' + query.message +
      '\n\nRead and reply securely at https://www.bishalpaudel23.com.np/inbox.html',
    html: '<p>A visitor sent a private query.</p><p><strong>From:</strong> ' +
      escapeHtml(query.name) + ' &lt;' + escapeHtml(query.email) +
      '&gt;<br><strong>Subject:</strong> ' + escapeHtml(query.subject) +
      '</p><p>' + safeMessage + '</p><p>Read and reply securely in the owner inbox on your portfolio.</p>'
  });
}

async function getSession(request, env) {
  const token = parseCookies(request)['__Secure-portfolio_session'];
  if (!token || !env.ADMIN_PASSWORD || !env.ADMIN_TOTP_SECRET) {
    return null;
  }
  const tokenHash = await sha256(token);
  const authFingerprint = await sha256(env.ADMIN_PASSWORD + ':' + env.ADMIN_TOTP_SECRET);
  const now = new Date().toISOString();
  const session = await env.DB.prepare(
    'SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ? AND auth_fingerprint = ?'
  ).bind(tokenHash, now, authFingerprint).first();
  return session ? tokenHash : null;
}

function sessionCookie(token, maxAge) {
  return '__Secure-portfolio_session=' + (token || '') +
    '; Path=/api/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge;
}

async function handleVisitorQuery(request, env, origin, allowedOrigins) {
  const body = await readJson(request);
  if (body.error) {
    return jsonResponse({ error: body.error }, 400, origin, allowedOrigins);
  }
  if (normalizeField(body.value.website)) {
    return jsonResponse({ saved: true, notificationSent: true }, 201, origin, allowedOrigins);
  }
  const expectedHostname = new URL(origin).hostname;
  const turnstileValid = await verifyTurnstile(
    env,
    normalizeField(body.value.turnstileToken),
    expectedHostname
  );
  if (!turnstileValid) {
    return jsonResponse({ error: 'Please complete the anti-spam check and try again.' }, 400, origin, allowedOrigins);
  }
  const validated = validQuery(body.value);
  if (validated.error) {
    return jsonResponse({ error: validated.error }, 400, origin, allowedOrigins);
  }
  if (!env.ADMIN_PASSWORD) {
    return jsonResponse({ error: 'Visitor query rate limiting is not configured.' }, 503, origin, allowedOrigins);
  }
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256(clientIp + ':' + env.ADMIN_PASSWORD);
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    'DELETE FROM query_submission_limits WHERE window_started <= ?'
  ).bind(now - QUERY_WINDOW_SECONDS).run();
  const submissionLimit = await env.DB.prepare(
    'INSERT INTO query_submission_limits (ip_hash, window_started, attempts) VALUES (?, ?, 1) ' +
    'ON CONFLICT(ip_hash) DO UPDATE SET ' +
    'attempts = CASE WHEN window_started <= ? THEN 1 ELSE attempts + 1 END, ' +
    'window_started = CASE WHEN window_started <= ? THEN excluded.window_started ELSE window_started END ' +
    'RETURNING attempts'
  ).bind(ipHash, now, now - QUERY_WINDOW_SECONDS, now - QUERY_WINDOW_SECONDS).first();
  if (!submissionLimit || !Number.isInteger(submissionLimit.attempts)) {
    throw new Error('Visitor query rate limit could not be enforced.');
  }
  if (submissionLimit.attempts > MAX_QUERY_SUBMISSIONS) {
    return jsonResponse({ error: 'Too many messages. Please try again later.' }, 429, origin, allowedOrigins);
  }
  const query = validated.query;
  const createdAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO visitor_queries (name, email, subject, message, status, created_at) ' +
      "VALUES (?, ?, ?, ?, 'new', ?)"
    ).bind(query.name, query.email, query.subject, query.message, createdAt),
    env.DB.prepare(
      'INSERT INTO security_audit_log (event_type, created_at) VALUES (?, ?)'
    ).bind('query_submitted', createdAt)
  ]);

  let notificationSent = true;
  try {
    await notifyOwner(env, query);
  } catch (error) {
    notificationSent = false;
    console.error('Query was saved, but the owner notification failed:', error);
  }
  return jsonResponse({ saved: true, notificationSent }, 201, origin, allowedOrigins);
}

async function recordFailedLogin(env, ipHash, now) {
  await env.DB.prepare(
    'INSERT INTO login_attempts (ip_hash, window_started, attempts) VALUES (?, ?, 1) ' +
    'ON CONFLICT(ip_hash) DO UPDATE SET ' +
    'attempts = CASE WHEN window_started <= ? THEN 1 ELSE attempts + 1 END, ' +
    'window_started = CASE WHEN window_started <= ? THEN excluded.window_started ELSE window_started END'
  ).bind(ipHash, now, now - LOGIN_WINDOW_SECONDS, now - LOGIN_WINDOW_SECONDS).run();
}

async function handleLogin(request, env, origin, allowedOrigins) {
  if (!env.ADMIN_PASSWORD || !env.ADMIN_TOTP_SECRET) {
    return jsonResponse({ error: 'Owner sign-in is not fully configured.' }, 503, origin, allowedOrigins);
  }
  try {
    decodeBase32(env.ADMIN_TOTP_SECRET);
  } catch (error) {
    console.error('Owner sign-in MFA secret is invalid:', error);
    return jsonResponse({ error: 'Owner sign-in is not fully configured.' }, 503, origin, allowedOrigins);
  }
  const body = await readJson(request);
  if (body.error) {
    return jsonResponse({ error: body.error }, 400, origin, allowedOrigins);
  }
  const password = normalizeField(body.value.password);
  const otp = normalizeField(body.value.otp);
  const ipHash = await sha256(
    (request.headers.get('CF-Connecting-IP') || 'unknown') + ':' + env.ADMIN_PASSWORD
  );
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    'DELETE FROM login_attempts WHERE window_started <= ?'
  ).bind(now - LOGIN_WINDOW_SECONDS).run();
  const attempt = await env.DB.prepare(
    'SELECT attempts, window_started FROM login_attempts WHERE ip_hash = ?'
  ).bind(ipHash).first();
  if (
    attempt &&
    attempt.window_started > now - LOGIN_WINDOW_SECONDS &&
    attempt.attempts >= MAX_LOGIN_ATTEMPTS
  ) {
    return jsonResponse({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }, 429, origin, allowedOrigins);
  }

  const totpCounter = await matchingTotpCounter(env.ADMIN_TOTP_SECRET, otp);
  if (!constantTimeEqual(password, env.ADMIN_PASSWORD) || totpCounter === null) {
    await recordFailedLogin(env, ipHash, now);
    await recordAuditEvent(env, 'login_failed');
    return jsonResponse({ error: 'Incorrect password.' }, 401, origin, allowedOrigins);
  }

  const acceptedCounter = await env.DB.prepare(
    'UPDATE admin_totp_state SET last_counter = ? WHERE id = 1 AND last_counter < ? RETURNING last_counter'
  ).bind(totpCounter, totpCounter).first();
  if (!acceptedCounter) {
    await recordFailedLogin(env, ipHash, now);
    await recordAuditEvent(env, 'login_replay_rejected');
    return jsonResponse({ error: 'That authenticator code has already been used. Wait for a new code and try again.' }, 401, origin, allowedOrigins);
  }

  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_hash = ?').bind(ipHash).run();
  const token = createToken();
  const tokenHash = await sha256(token);
  const authFingerprint = await sha256(env.ADMIN_PASSWORD + ':' + env.ADMIN_TOTP_SECRET);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run();
  await env.DB.prepare(
    'DELETE FROM admin_sessions WHERE auth_fingerprint IS NULL OR auth_fingerprint != ?'
  ).bind(authFingerprint).run();
  await env.DB.prepare(
    'INSERT INTO admin_sessions (token_hash, expires_at, auth_fingerprint) VALUES (?, ?, ?)'
  ).bind(tokenHash, expiresAt, authFingerprint).run();
  await recordAuditEvent(env, 'login_succeeded');

  const response = jsonResponse({ authenticated: true }, 200, origin, allowedOrigins);
  response.headers.append('Set-Cookie', sessionCookie(token, SESSION_SECONDS));
  return response;
}

async function handleAdminQueries(env, origin, allowedOrigins, beforeId) {
  const statement = beforeId
    ? env.DB.prepare(
      'SELECT id, name, email, subject, message, status, created_at ' +
      'FROM visitor_queries WHERE id < ? ORDER BY id DESC LIMIT 51'
    ).bind(beforeId)
    : env.DB.prepare(
      'SELECT id, name, email, subject, message, status, created_at ' +
      'FROM visitor_queries ORDER BY id DESC LIMIT 51'
    );
  const result = await statement.all();
  const rows = result.results || [];
  const hasMore = rows.length > 50;
  const queries = rows.slice(0, 50);
  if (!queries.length) {
    return jsonResponse({ queries: [], hasMore: false }, 200, origin, allowedOrigins);
  }
  const placeholders = queries.map(function () { return '?'; }).join(',');
  const repliesStatement = env.DB.prepare(
    'SELECT id, query_id, message, status, created_at FROM query_replies ' +
    'WHERE query_id IN (' + placeholders + ') ORDER BY created_at ASC'
  );
  const replies = await repliesStatement.bind(...queries.map(function (query) {
    return query.id;
  })).all();
  const replyMap = new Map();
  (replies.results || []).forEach(function (reply) {
    if (!replyMap.has(reply.query_id)) {
      replyMap.set(reply.query_id, []);
    }
    replyMap.get(reply.query_id).push(reply);
  });
  return jsonResponse({
    queries: queries.map(function (query) {
      return Object.assign({}, query, { replies: replyMap.get(query.id) || [] });
    }),
    hasMore
  }, 200, origin, allowedOrigins);
}

async function markRead(request, env, queryId, origin, allowedOrigins) {
  if (!/^\d+$/.test(queryId)) {
    return jsonResponse({ error: 'Query not found.' }, 404, origin, allowedOrigins);
  }
  const result = await env.DB.prepare(
    "UPDATE visitor_queries SET status = 'read' WHERE id = ? AND status = 'new'"
  ).bind(Number(queryId)).run();
  if (!result.meta || result.meta.changes === 0) {
    const query = await env.DB.prepare('SELECT id FROM visitor_queries WHERE id = ?')
      .bind(Number(queryId)).first();
    if (!query) {
      return jsonResponse({ error: 'Query not found.' }, 404, origin, allowedOrigins);
    }
  }
  return jsonResponse({ updated: true }, 200, origin, allowedOrigins);
}

async function sendReply(request, env, queryId, origin, allowedOrigins) {
  if (!/^\d+$/.test(queryId)) {
    return jsonResponse({ error: 'Query not found.' }, 404, origin, allowedOrigins);
  }
  const body = await readJson(request);
  if (body.error) {
    return jsonResponse({ error: body.error }, 400, origin, allowedOrigins);
  }
  const message = normalizeField(body.value.message);
  if (!message || message.length > 4000) {
    return jsonResponse({ error: 'Reply must be between 1 and 4000 characters.' }, 400, origin, allowedOrigins);
  }
  const query = await env.DB.prepare(
    'SELECT id, email, subject FROM visitor_queries WHERE id = ?'
  ).bind(Number(queryId)).first();
  if (!query) {
    return jsonResponse({ error: 'Query not found.' }, 404, origin, allowedOrigins);
  }

  try {
    await sendEmail(env, {
      from: env.FROM_EMAIL,
      to: [query.email],
      reply_to: env.ADMIN_EMAIL,
      subject: 'Re: ' + query.subject,
      text: message,
      html: '<p>' + escapeHtml(message).replace(/\n/g, '<br>') + '</p>'
    });
  } catch (error) {
    console.error('Reply email could not be sent:', error);
    return jsonResponse({
      error: error instanceof Error
        ? error.message
        : 'The reply email could not be sent. Check the Worker logs and email configuration.'
    }, 502, origin, allowedOrigins);
  }

  const createdAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO query_replies (query_id, message, status, created_at) VALUES (?, ?, 'sent', ?)"
    ).bind(query.id, message, createdAt),
    env.DB.prepare(
      "UPDATE visitor_queries SET status = 'replied' WHERE id = ?"
    ).bind(query.id),
    env.DB.prepare(
      'INSERT INTO security_audit_log (event_type, resource_id, created_at) VALUES (?, ?, ?)'
    ).bind('query_replied', query.id, createdAt)
  ]);
  return jsonResponse({ sent: true }, 200, origin, allowedOrigins);
}

export default {
  async fetch(request, env) {
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(function (value) {
      return value.trim().replace(/\/+$/, '');
    }).filter(Boolean);
    const requestOrigin = request.headers.get('Origin');
    const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : null;
    const path = new URL(request.url).pathname;
    const isWrite = request.method === 'POST';

    if (!allowedOrigins.length) {
      return jsonResponse({ error: 'The website origin allowlist is not configured.' }, 500, null, allowedOrigins);
    }
    if (requestOrigin && !origin) {
      return jsonResponse({ error: 'This website is not allowed to use the inbox.' }, 403, null, allowedOrigins);
    }
    if (isWrite && !origin) {
      return jsonResponse({ error: 'A trusted website origin is required.' }, 403, null, allowedOrigins);
    }
    if (isWrite && !await verifyRequestOrigin(request, origin, allowedOrigins)) {
      return jsonResponse({ error: 'The request origin or content type is not allowed.' }, 403, origin, allowedOrigins);
    }
    if (request.method === 'OPTIONS') {
      return origin
        ? jsonResponse({}, 204, origin, allowedOrigins)
        : jsonResponse({ error: 'This website is not allowed to use the inbox.' }, 403, null, allowedOrigins);
    }

    try {
      if (path === '/api/config' && request.method === 'GET') {
        if (!env.TURNSTILE_SITE_KEY) {
          return jsonResponse({ error: 'Anti-spam protection is not configured.' }, 503, origin, allowedOrigins);
        }
        return jsonResponse({ turnstileSiteKey: env.TURNSTILE_SITE_KEY }, 200, origin, allowedOrigins);
      }
      if (path === '/api/queries' && request.method === 'POST') {
        if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) {
          return jsonResponse({ error: 'Anti-spam protection is not configured.' }, 503, origin, allowedOrigins);
        }
        const rateLimit = await env.QUERY_RATE_LIMITER.limit({
          key: request.headers.get('CF-Connecting-IP') || 'unknown'
        });
        if (!rateLimit.success) {
          return jsonResponse({ error: 'Too many messages. Please wait a minute before trying again.' }, 429, origin, allowedOrigins);
        }
        return await handleVisitorQuery(request, env, origin, allowedOrigins);
      }
      if (path === '/api/admin/login' && request.method === 'POST') {
        return await handleLogin(request, env, origin, allowedOrigins);
      }
      if (path === '/api/admin/session' && request.method === 'GET') {
        const session = await getSession(request, env);
        return session
          ? jsonResponse({ authenticated: true }, 200, origin, allowedOrigins)
          : jsonResponse({ error: 'Please sign in to view the inbox.' }, 401, origin, allowedOrigins);
      }
      if (path === '/api/admin/logout' && request.method === 'POST') {
        const session = await getSession(request, env);
        if (session) {
          await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(session).run();
          await recordAuditEvent(env, 'logout');
        }
        const response = jsonResponse({ authenticated: false }, 200, origin, allowedOrigins);
        response.headers.append('Set-Cookie', sessionCookie('', 0));
        return response;
      }

      if (path === '/api/admin/queries' && request.method === 'GET') {
        const session = await getSession(request, env);
        if (!session) {
          return jsonResponse({ error: 'Please sign in to view the inbox.' }, 401, origin, allowedOrigins);
        }
        const before = new URL(request.url).searchParams.get('before');
        if (before && !/^\d+$/.test(before)) {
          return jsonResponse({ error: 'Invalid query page.' }, 400, origin, allowedOrigins);
        }
        const beforeId = before && /^\d+$/.test(before) ? Number(before) : null;
        return await handleAdminQueries(env, origin, allowedOrigins, beforeId);
      }
      const adminQueryPath = path.match(/^\/api\/admin\/queries\/([^/]+)\/(read|replies)$/);
      if (adminQueryPath && request.method === 'POST') {
        const session = await getSession(request, env);
        if (!session) {
          return jsonResponse({ error: 'Please sign in to manage the inbox.' }, 401, origin, allowedOrigins);
        }
        if (adminQueryPath[2] === 'read') {
          const response = await markRead(request, env, adminQueryPath[1], origin, allowedOrigins);
          if (response.ok) {
            await recordAuditEvent(env, 'query_marked_read', Number(adminQueryPath[1]));
          }
          return response;
        }
        if (adminQueryPath[2] === 'replies') {
          return await sendReply(request, env, adminQueryPath[1], origin, allowedOrigins);
        }
      }
      return jsonResponse({ error: 'Not found.' }, 404, origin, allowedOrigins);
    } catch (error) {
      console.error('Inbox request failed:', error);
      return jsonResponse({ error: 'The request could not be completed. Please try again.' }, 500, origin, allowedOrigins);
    }
  },
  async scheduled(controller, env, context) {
    context.waitUntil(env.DB.prepare(
      "DELETE FROM security_audit_log WHERE date(created_at) < date('now', ?)"
    ).bind('-' + AUDIT_RETENTION_DAYS + ' days').run());
  }
};

export { matchingTotpCounter, totpCode, verifyRequestOrigin, verifyTurnstile };
