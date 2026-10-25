# Bishal Bikram Paudel — portfolio

The public portfolio is a React and TypeScript app built with Vite, Tailwind CSS, and Framer Motion. Vite builds both the portfolio and the standalone private query inbox; the Cloudflare Worker/API contract is unchanged.

## Local development

```sh
npm ci
npm run dev
```

Create and inspect a production bundle with:

```sh
npm run build
npm run preview
```

The Vite build writes the portfolio and inbox pages to `dist/`. The portrait and custom-domain file are served from `public/`; the root `CNAME` and `myphoto.jpg` are retained for existing repository links.

## Deployment

The GitHub Actions workflow builds and deploys `dist/` to GitHub Pages when changes are pushed to `main`. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The workflow copies the custom domain file into the Pages artifact.

The query form continues to post to `/api/queries`; the existing Cloudflare Worker handles storage and inbox notifications. Keep the Worker route and the Pages site on the same custom domain.

## Structure

- `src/App.tsx` — page sections, accessible controls, bilingual content, query form, and reusable motion components.
- `src/styles.css` — Tailwind entry point and portfolio-specific responsive styles.
- `tailwind.config.js` — Tailwind theme extensions.
- `public/` — static files copied into the production site.
- `inbox.html`, `inbox.js`, `worker/` — existing private inbox and API.
