# Private portfolio query inbox

Visitors can send private messages from **General Queries**. Cloudflare D1 stores each message, and the protected `inbox.html` page lets the owner read it, mark it as read, and email a reply to the visitor. The inbox API is served by a Cloudflare Worker on the portfolio's `/api/*` path; the static portfolio can remain on GitHub Pages.

## One-time setup

1. Add `www.bishalpaudel23.com.np` to Cloudflare DNS and make sure its record is proxied through Cloudflare. The Worker route in `wrangler.toml` requires the domain to be in this Cloudflare zone. Keep the apex domain redirected to `www`.
2. Install Wrangler and authenticate from this directory:

   ```powershell
   npx wrangler login
   ```

3. Create the D1 database:

   ```powershell
   npx wrangler d1 create portfolio-queries
   ```

   Copy the returned database ID into `database_id` in `wrangler.toml`.
4. Apply the schema:

   ```powershell
   npx wrangler d1 execute portfolio-queries --remote --file=migrations/0001_visitor_queries.sql
   npx wrangler d1 execute portfolio-queries --remote --file=migrations/0002_query_submission_limits.sql
   npx wrangler d1 execute portfolio-queries --remote --file=migrations/0003_owner_mfa.sql
   npx wrangler d1 execute portfolio-queries --remote --file=migrations/0004_security_audit_log.sql
   ```

5. Verify `ADMIN_EMAIL`, `FROM_EMAIL`, `ALLOWED_ORIGINS`, and the Worker route in `wrangler.toml`. `FROM_EMAIL` must use a domain verified with Resend. Ensure every public website origin is listed exactly in `ALLOWED_ORIGINS`.
6. Create a Cloudflare Turnstile widget for both portfolio hostnames (`www.bishalpaudel23.com.np` and `bishalpaudel23.com.np`). Copy its public site key into `TURNSTILE_SITE_KEY` in `wrangler.toml`, and set the private secret with Wrangler. Use a unique, randomly generated owner password with at least 20 characters. Generate a 160-bit Base32 TOTP secret on your own computer, add that secret to an authenticator app, and keep a secure backup. Do not use an online QR-code generator:

   ```powershell
   npx wrangler secret put TURNSTILE_SECRET_KEY
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put ADMIN_TOTP_SECRET
   npx wrangler secret put RESEND_API_KEY
   ```

   To generate a Base32 secret in PowerShell, run this Node command, then use its output when Wrangler prompts for `ADMIN_TOTP_SECRET`:

   ```powershell
   node -e "const b=require('node:crypto').randomBytes(20); let bits=''; for(const x of b) bits+=x.toString(2).padStart(8,'0'); let s=''; for(let i=0;i<bits.length;i+=5) s+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[parseInt(bits.slice(i,i+5).padEnd(5,'0'),2)]; console.log(s)"
   ```

   Keep all secret values out of the website and repository. Use a TOTP-compatible authenticator with a 30-second period, six digits, and SHA-1.
7. Deploy the Worker:

   ```powershell
   npx wrangler deploy
   ```

8. Publish the generated `dist` directory to GitHub Pages. The production build generates the crawlable Nepali page at `/ne/` and copies `robots.txt` and `sitemap.xml` from `public`. Then open `https://www.bishalpaudel23.com.np/inbox.html`, sign in with the `ADMIN_PASSWORD` and a fresh authenticator code, and test sending a query and replying to it.

The inbox requires both the password and a six-digit TOTP code. Each code can be used only once; codes have a one-step clock-skew allowance. The session cookie is HTTP-only, secure, and expires after eight hours. Session records are tied to the current password and TOTP secret, so rotating either secret immediately invalidates all existing sessions. The Worker limits failed sign-in attempts per visitor IP, rate-limits the query endpoint to 10 requests per minute at the edge and five valid submissions per IP per hour in D1, and uses Turnstile plus a honeypot to reduce automated form submissions. Turnstile tokens are verified server-side for the expected hostname and action; configure both the public site key and private secret before deploying. The D1 limiter stores only a SHA-256 hash of the visitor IP, keyed with the existing `ADMIN_PASSWORD` secret; it does not store raw IP addresses. SQL statements use D1 prepared statements and bound values. The Worker also validates and bounds submissions, and only permits requests from the configured website origins. POST requests require the exact allowed `Origin`, JSON content type, and (when present) a same-origin Fetch Metadata header; the admin cookie is `SameSite=Lax`. New queries are saved even if the notification email fails; the website will report that the email alert could not be sent.

The D1 audit log records login success/failure, TOTP replay rejection, logout, query submission, and inbox read/reply events. It deliberately omits IP addresses, email addresses, message bodies, passwords, TOTP codes, and session tokens. Entries older than 180 days are removed by the Worker’s monthly scheduled trigger. Audit events are operational records, not tamper-proof evidence; protect Cloudflare account access and review Worker/D1 access logs as well.

## Secret rotation, HSTS, and security headers

Rotate the owner password with `npx wrangler secret put ADMIN_PASSWORD`. Existing inbox sessions stop working as soon as the secret is updated; no manual session-table cleanup is required. Rotate `ADMIN_TOTP_SECRET` the same way if the authenticator is lost or compromised, and enroll the new secret in the replacement authenticator. Each secret update must complete its Worker deployment before the new value is active. Never send secrets in chat or commit them.

The Worker adds HSTS, no-store, CSP, frame, MIME-sniffing, referrer, and permissions headers to API responses. For the static website, enable HSTS in Cloudflare's **SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)** settings for `www.bishalpaudel23.com.np`. Confirm HTTPS and redirects work first; start with a short max-age, then raise it to 12 months after verification. Leave `includeSubDomains` and `preload` off unless every affected hostname is guaranteed to support HTTPS. HSTS is sticky in browsers, so disabling HTTPS after enabling it can make the domain unavailable until the policy expires.

The public pages are served by GitHub Pages, so apply the other response-header rules in the Cloudflare dashboard for the proxied website host and verify them on `/`, `/ne/`, and `/inbox.html`. The Turnstile domains below must be allowed by CSP:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; upgrade-insecure-requests` |
| `Permissions-Policy` | `camera=(), geolocation=(), microphone=()` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |

Use a Cloudflare Response Header Transform Rule on the proxied static site for CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options, and X-Frame-Options. HSTS is configured separately under Edge Certificates. These dashboard settings are not part of the GitHub Pages workflow; do not assume they are active until response headers have been checked in a browser or with `curl.exe -I https://www.bishalpaudel23.com.np/`.

## D1 backup and restore

Visitor messages and replies contain personal information. Export backups to a private, encrypted location outside the repository; do not upload them to GitHub or include them in support requests. For example, from this `worker` directory in PowerShell:

```powershell
$backupDirectory = Join-Path $env:USERPROFILE "portfolio-d1-backups"
New-Item -ItemType Directory -Force $backupDirectory | Out-Null
$backupFile = Join-Path $backupDirectory ("portfolio-queries-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".sql")
npx wrangler d1 export portfolio-queries --remote --output=$backupFile
```

Schedule regular exports to encrypted storage with restricted access, keep a documented retention period, and periodically test a restore. To restore without overwriting the live database, create a new D1 database and import the dump there:

```powershell
npx wrangler d1 create portfolio-queries-restore
npx wrangler d1 execute portfolio-queries-restore --remote --file="C:\path\to\your\private-backup.sql"
```

Verify the restored tables and sample records, then update the Worker D1 binding to the new database ID and deploy. Keep the prior database until the restored site is confirmed healthy. The export includes private visitor data, so protect and securely remove temporary copies when no longer needed.

For an existing deployment, apply migrations `0002_query_submission_limits.sql`, `0003_owner_mfa.sql`, and `0004_security_audit_log.sql`, set `TURNSTILE_SITE_KEY` in `wrangler.toml`, and set `TURNSTILE_SECRET_KEY` with Wrangler before deploying the Worker. The `QUERY_RATE_LIMITER` binding and monthly audit-retention trigger are configured in `wrangler.toml`.

## Email provider

Replies and new-query notifications use Resend. Configure a verified sender address in `FROM_EMAIL`, set `ADMIN_EMAIL` to the inbox that should receive notifications, and store the Resend API key as a Worker secret. The visitor's email is used as the reply recipient; replies sent in the owner inbox are also saved in D1. If Resend rejects a reply, the signed-in inbox shows its HTTP status and error code; inspect the Worker logs for the sanitized provider reason. Never share or paste the `RESEND_API_KEY`.
