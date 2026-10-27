import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import worker, {
  matchingTotpCounter,
  totpCode,
  verifyRequestOrigin,
  verifyTurnstile,
} from "../src/index.js";

const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

function createDatabase() {
  const sessions = new Map();
  const auditEvents = [];
  let lastTotpCounter = -1;

  const DB = {
    prepare(sql) {
      let parameters = [];
      const statement = {
        bind(...values) {
          parameters = values;
          return statement;
        },
        async first() {
          if (sql.includes("SELECT attempts, window_started FROM login_attempts")) {
            return null;
          }
          if (sql.includes("UPDATE admin_totp_state")) {
            const [counter] = parameters;
            if (counter <= lastTotpCounter) {
              return null;
            }
            lastTotpCounter = counter;
            return { last_counter: counter };
          }
          if (sql.includes("SELECT token_hash FROM admin_sessions")) {
            const [tokenHash, expiresAt, fingerprint] = parameters;
            const session = sessions.get(tokenHash);
            return session && session.expiresAt > expiresAt && session.fingerprint === fingerprint
              ? { token_hash: tokenHash }
              : null;
          }
          return null;
        },
        async run() {
          if (sql.includes("INSERT INTO admin_sessions")) {
            const [tokenHash, expiresAt, fingerprint] = parameters;
            sessions.set(tokenHash, { expiresAt, fingerprint });
          } else if (sql.includes("DELETE FROM admin_sessions WHERE auth_fingerprint")) {
            for (const [tokenHash, session] of sessions) {
              if (session.fingerprint !== parameters[0]) {
                sessions.delete(tokenHash);
              }
            }
          } else if (sql.includes("INSERT INTO security_audit_log")) {
            auditEvents.push(parameters[0]);
          }
          return { success: true };
        },
      };
      return statement;
    },
    async batch(statements) {
      for (const statement of statements) {
        await statement.run();
      }
      return [];
    },
  };
  return { DB, auditEvents };
}

test("TOTP follows RFC 6238 SHA-1 six-digit vectors", async () => {
  assert.equal(await totpCode(secret, 1), "287082");
});

test("TOTP accepts only a code within the configured time window", async () => {
  assert.equal(await matchingTotpCounter(secret, "287082", 59_000), 1);
  assert.equal(await matchingTotpCounter(secret, "000000", 59_000), null);
});

test("Turnstile validates response success, hostname, and action", async (t) => {
  const originalFetch = globalThis.fetch;
  let action = "visitor_query";
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const body = new URLSearchParams(options.body);
    assert.equal(body.get("secret"), "test-secret");
    assert.equal(body.get("response"), "test-token");
    return Response.json({
      success: true,
      hostname: "portfolio.example",
      action,
    });
  };

  assert.equal(await verifyTurnstile({
    TURNSTILE_SECRET_KEY: "test-secret",
    TURNSTILE_SITE_KEY: "public-site-key",
  }, "test-token", "portfolio.example"), true);
  assert.equal(await verifyTurnstile({
    TURNSTILE_SECRET_KEY: "test-secret",
    TURNSTILE_SITE_KEY: "public-site-key",
  }, "test-token", "attacker.example"), false);
  action = "admin_login";
  assert.equal(await verifyTurnstile({
    TURNSTILE_SECRET_KEY: "test-secret",
    TURNSTILE_SITE_KEY: "public-site-key",
  }, "test-token", "portfolio.example"), false);
  await assert.rejects(
    verifyTurnstile({ TURNSTILE_SITE_KEY: "public-site-key" }, "test-token", "portfolio.example"),
    /Turnstile is not configured/,
  );
});

test("POST requests require trusted same-origin JSON requests", async () => {
  const trusted = new Request("https://portfolio.example/api/admin/logout", {
    method: "POST",
    headers: {
      Origin: "https://portfolio.example",
      "Sec-Fetch-Site": "same-origin",
      "Content-Type": "application/json",
    },
  });
  assert.equal(await verifyRequestOrigin(trusted, "https://portfolio.example", [
    "https://portfolio.example",
  ]), true);

  const crossSite = new Request("https://portfolio.example/api/admin/logout", {
    method: "POST",
    headers: {
      Origin: "https://portfolio.example",
      "Sec-Fetch-Site": "cross-site",
      "Content-Type": "application/json",
    },
  });
  assert.equal(await verifyRequestOrigin(crossSite, "https://portfolio.example", [
    "https://portfolio.example",
  ]), false);

  const formRequest = new Request("https://portfolio.example/api/admin/logout", {
    method: "POST",
    headers: {
      Origin: "https://portfolio.example",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  assert.equal(await verifyRequestOrigin(formRequest, "https://portfolio.example", [
    "https://portfolio.example",
  ]), false);
});

test("credential rotation invalidates an existing inbox session", async () => {
  const { DB, auditEvents } = createDatabase();
  const env = {
    ADMIN_PASSWORD: "original-long-password",
    ADMIN_TOTP_SECRET: secret,
    ALLOWED_ORIGINS: "https://portfolio.example",
    DB,
  };
  const code = await totpCode(secret, Math.floor(Date.now() / 30_000));
  const login = await worker.fetch(new Request("https://portfolio.example/api/admin/login", {
    method: "POST",
    headers: {
      Origin: "https://portfolio.example",
      "CF-Connecting-IP": "192.0.2.1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: env.ADMIN_PASSWORD, otp: code }),
  }), env);

  assert.equal(login.status, 200);
  assert.ok(auditEvents.includes("login_succeeded"));
  const cookie = login.headers.get("Set-Cookie").split(";")[0];
  const replay = await worker.fetch(new Request("https://portfolio.example/api/admin/login", {
    method: "POST",
    headers: {
      Origin: "https://portfolio.example",
      "CF-Connecting-IP": "192.0.2.1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: env.ADMIN_PASSWORD, otp: code }),
  }), env);
  assert.equal(replay.status, 401);
  assert.ok(auditEvents.includes("login_replay_rejected"));

  const authenticated = await worker.fetch(new Request("https://portfolio.example/api/admin/session", {
    headers: { Cookie: cookie },
  }), env);
  assert.equal(authenticated.status, 200);

  env.ADMIN_PASSWORD = "rotated-long-password";
  const revoked = await worker.fetch(new Request("https://portfolio.example/api/admin/session", {
    headers: { Cookie: cookie },
  }), env);
  assert.equal(revoked.status, 401);
});

test("Worker API responses include security headers", async () => {
  const response = await worker.fetch(new Request("https://portfolio.example/api/not-found"), {
    ALLOWED_ORIGINS: "https://portfolio.example",
  });
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Strict-Transport-Security"), "max-age=31536000");
});

test("public config endpoint exposes only the Turnstile site key", async () => {
  const response = await worker.fetch(new Request("https://portfolio.example/api/config"), {
    ALLOWED_ORIGINS: "https://portfolio.example",
    TURNSTILE_SITE_KEY: "public-site-key",
    TURNSTILE_SECRET_KEY: "private-secret",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { turnstileSiteKey: "public-site-key" });
});

test("production build contains crawlable English and Nepali pages", async () => {
  const english = await readFile(new URL("../../dist/index.html", import.meta.url), "utf8");
  const nepali = await readFile(new URL("../../dist/ne/index.html", import.meta.url), "utf8");
  assert.match(english, /rel="canonical" href="https:\/\/www\.bishalpaudel23\.com\.np\/"/);
  assert.match(english, /hreflang="ne" href="https:\/\/www\.bishalpaudel23\.com\.np\/ne\/"/);
  assert.match(nepali, /<html lang="ne">/);
  assert.match(nepali, /rel="canonical" href="https:\/\/www\.bishalpaudel23\.com\.np\/ne\/"/);
  assert.match(nepali, /मैले Kantipur Engineering College बाट Computer Engineering पढेको हुँ/);
  await access(new URL("../../dist/ne/index.html", import.meta.url));
  const scripts = [...english.matchAll(/<script[^>]+src="([^"]+)"/g)];
  assert.ok(scripts.length >= 1);
  for (const [, path] of scripts) {
    await access(new URL(path.replace(/^\//, ""), new URL("../../dist/", import.meta.url)));
  }
});
