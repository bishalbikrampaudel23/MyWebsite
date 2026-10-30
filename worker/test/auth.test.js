import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import worker, { verifyRequestOrigin, verifyTurnstile } from "../src/index.js";

function createDatabase() {
  const sessions = new Map();
  const auditEvents = [];

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

test("password-only sign-in rejects an incorrect password", async () => {
  const { DB, auditEvents } = createDatabase();
  const env = {
    ADMIN_PASSWORD: "original-long-password",
    ALLOWED_ORIGINS: "https://portfolio.example",
    DB,
  };
  const login = await worker.fetch(new Request("https://portfolio.example/api/admin/login", {
    method: "POST",
    headers: {
      Origin: "https://portfolio.example",
      "CF-Connecting-IP": "192.0.2.1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
  }), env);

  assert.equal(login.status, 200);
  assert.ok(auditEvents.includes("login_succeeded"));
  const denied = await worker.fetch(new Request("https://portfolio.example/api/admin/login", {
    method: "POST",
    headers: {
      Origin: "https://portfolio.example",
      "CF-Connecting-IP": "192.0.2.1",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: "wrong-password" }),
  }), env);
  assert.equal(denied.status, 401);
  assert.ok(auditEvents.includes("login_failed"));
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
