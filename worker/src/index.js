const MAX_BODY_LENGTH = 20000;
const SESSION_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const MAX_LOGIN_ATTEMPTS = 5;

function jsonResponse(data, status, origin, allowedOrigins) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
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
    console.error('Email provider rejected request:', {
      status: response.status,
      code: typeof providerError.name === 'string' ? providerError.name : 'unknown',
      message: message
    });
    throw new Error('Email delivery failed.');
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
  if (!token) {
    return null;
  }
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const session = await env.DB.prepare(
    'SELECT token_hash FROM admin_sessions WHERE token_hash = ? AND expires_at > ?'
  ).bind(tokenHash, now).first();
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
  const validated = validQuery(body.value);
  if (validated.error) {
    return jsonResponse({ error: validated.error }, 400, origin, allowedOrigins);
  }
  const query = validated.query;
  const createdAt = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO visitor_queries (name, email, subject, message, status, created_at) ' +
    "VALUES (?, ?, ?, ?, 'new', ?)"
  ).bind(query.name, query.email, query.subject, query.message, createdAt).run();

  let notificationSent = true;
  try {
    await notifyOwner(env, query);
  } catch (error) {
    notificationSent = false;
    console.error('Query was saved, but the owner notification failed:', error);
  }
  return jsonResponse({ saved: true, notificationSent }, 201, origin, allowedOrigins);
}

async function handleLogin(request, env, origin, allowedOrigins) {
  if (!env.ADMIN_PASSWORD) {
    return jsonResponse({ error: 'Owner sign-in is not configured.' }, 503, origin, allowedOrigins);
  }
  const body = await readJson(request);
  if (body.error) {
    return jsonResponse({ error: body.error }, 400, origin, allowedOrigins);
  }
  const password = normalizeField(body.value.password);
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

  if (!constantTimeEqual(password, env.ADMIN_PASSWORD)) {
    await env.DB.prepare(
      'INSERT INTO login_attempts (ip_hash, window_started, attempts) VALUES (?, ?, 1) ' +
      'ON CONFLICT(ip_hash) DO UPDATE SET ' +
      'attempts = CASE WHEN window_started <= ? THEN 1 ELSE attempts + 1 END, ' +
      'window_started = CASE WHEN window_started <= ? THEN excluded.window_started ELSE window_started END'
    ).bind(ipHash, now, now - LOGIN_WINDOW_SECONDS, now - LOGIN_WINDOW_SECONDS).run();
    return jsonResponse({ error: 'Incorrect password.' }, 401, origin, allowedOrigins);
  }

  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_hash = ?').bind(ipHash).run();
  const token = createToken();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run();
  await env.DB.prepare(
    'INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)'
  ).bind(tokenHash, expiresAt).run();

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
    return jsonResponse({ error: 'The reply email could not be sent. Check the email configuration and try again.' }, 502, origin, allowedOrigins);
  }

  const createdAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO query_replies (query_id, message, status, created_at) VALUES (?, ?, 'sent', ?)"
    ).bind(query.id, message, createdAt),
    env.DB.prepare(
      "UPDATE visitor_queries SET status = 'replied' WHERE id = ?"
    ).bind(query.id)
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
    if (request.method === 'OPTIONS') {
      return origin
        ? jsonResponse({}, 204, origin, allowedOrigins)
        : jsonResponse({ error: 'This website is not allowed to use the inbox.' }, 403, null, allowedOrigins);
    }

    try {
      if (path === '/api/queries' && request.method === 'POST') {
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
          return await markRead(request, env, adminQueryPath[1], origin, allowedOrigins);
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
  }
};
