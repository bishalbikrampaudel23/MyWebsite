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
   ```

5. Verify `ADMIN_EMAIL`, `FROM_EMAIL`, `ALLOWED_ORIGINS`, and the Worker route in `wrangler.toml`. `FROM_EMAIL` must use a domain verified with Resend. Ensure every public website origin is listed exactly in `ALLOWED_ORIGINS`.
6. Set private Worker secrets. Use a unique, randomly generated password with at least 20 characters:

   ```powershell
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put RESEND_API_KEY
   ```

   Keep these values out of the website and repository.
7. Deploy the Worker:

   ```powershell
   npx wrangler deploy
   ```

8. Publish the website files, including `inbox.html`, `inbox.js`, and `queries.js`, to GitHub Pages. Then open `https://www.bishalpaudel23.com.np/inbox.html`, sign in with the `ADMIN_PASSWORD`, and test sending a query and replying to it.

The session cookie is HTTP-only, secure, and expires after eight hours. The Worker limits failed sign-in attempts per visitor IP, rate-limits the query endpoint to 10 requests per minute at the edge and five valid submissions per IP per hour in D1, and uses a honeypot field to silently discard basic bot submissions. The D1 limiter stores only a SHA-256 hash of the visitor IP, keyed with the existing `ADMIN_PASSWORD` secret; it does not store raw IP addresses. SQL statements use D1 prepared statements and bound values. The Worker also validates and bounds submissions, and only permits requests from the configured website origins. New queries are saved even if the notification email fails; the website will report that the email alert could not be sent.

For an existing deployment, apply `migrations/0002_query_submission_limits.sql` to the remote database before deploying the Worker. The `QUERY_RATE_LIMITER` binding is configured in `wrangler.toml` and is deployed with the Worker.

## Email provider

Replies and new-query notifications use Resend. Configure a verified sender address in `FROM_EMAIL`, set `ADMIN_EMAIL` to the inbox that should receive notifications, and store the Resend API key as a Worker secret. The visitor's email is used as the reply recipient; replies sent in the owner inbox are also saved in D1. If Resend rejects a reply, the signed-in inbox shows its HTTP status and error code; inspect the Worker logs for the sanitized provider reason. Never share or paste the `RESEND_API_KEY`.
