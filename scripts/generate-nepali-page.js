import { readFile, mkdir, writeFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sourcePath = new URL("preferences.js", root);
const pagePath = new URL("dist/index.html", root);
const outputPath = new URL("dist/ne/index.html", root);
const translationSource = await readFile(sourcePath, "utf8");
const translationMatch = translationSource.match(
  /var translations = (\{[\s\S]*?\n  \});/,
);

if (!translationMatch) {
  throw new Error("Could not find the portfolio translation dictionary.");
}

const translations = vm.runInNewContext(`(${translationMatch[1]})`);
let html = await readFile(pagePath, "utf8");

function replaceOnce(pattern, replacement, description) {
  const updated = html.replace(pattern, replacement);
  if (updated === html) {
    throw new Error(`Could not update ${description} in the Nepali page.`);
  }
  html = updated;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

html = html.replace(
  /<([a-z][\w-]*)\b(?=[^>]*\bdata-i18n="([^"]+)")[^>]*>[\s\S]*?<\/\1>/gi,
  (element, tag, key) => {
    const translation = translations[key];
    return typeof translation === "string"
      ? element.replace(
          new RegExp(`(<${tag}\\b[^>]*>)[\\s\\S]*?(</${tag}>)`, "i"),
          `$1${escapeHtml(translation)}$2`,
        )
      : element;
  },
);
html = html.replace(/<[^>]*>/g, (tag) => {
  const altKey = tag.match(/\bdata-i18n-alt="([^"]+)"/)?.[1];
  const ariaKey = tag.match(/\bdata-i18n-aria-label="([^"]+)"/)?.[1];
  if (altKey && typeof translations[altKey] === "string") {
    tag = tag.replace(
      /\balt="[^"]*"/,
      `alt="${escapeHtml(translations[altKey])}"`,
    );
  }
  if (ariaKey && typeof translations[ariaKey] === "string") {
    tag = tag.replace(
      /\baria-label="[^"]*"/,
      `aria-label="${escapeHtml(translations[ariaKey])}"`,
    );
  }
  return tag;
});

replaceOnce('<html lang="en">', '<html lang="ne">', "document language");
replaceOnce(
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">\n  <base href="/">',
  "base URL",
);
html = html.replace(
  /<title>[\s\S]*?<\/title>/,
  "<title>बिशाल बिक्रम पौडेल | Computer Engineer र Student Leader</title>",
);
html = html.replace(
  /<meta name="description" content="[^"]*">/,
  '<meta name="description" content="AI/ML, software development र student leadership मा सक्रिय Computer Engineer बिशाल बिक्रम पौडेलको portfolio।">',
);
html = html.replace(
  /<link rel="canonical" href="[^"]*">/,
  '<link rel="canonical" href="https://www.bishalpaudel23.com.np/ne/">',
);
html = html.replace(
  /<meta property="og:locale" content="[^"]*">/,
  '<meta property="og:locale" content="ne_NP">',
);
html = html.replace(
  /<meta property="og:title" content="[^"]*">/,
  '<meta property="og:title" content="बिशाल बिक्रम पौडेल | Computer Engineer र Student Leader">',
);
html = html.replace(
  /<meta property="og:description" content="[^"]*">/,
  '<meta property="og:description" content="AI/ML, software development र student leadership मा सक्रिय Computer Engineer बिशाल बिक्रम पौडेलको portfolio।">',
);
html = html.replace(
  /<meta property="og:url" content="[^"]*">/,
  '<meta property="og:url" content="https://www.bishalpaudel23.com.np/ne/">',
);
html = html.replace(
  /<meta name="twitter:title" content="[^"]*">/,
  '<meta name="twitter:title" content="बिशाल बिक्रम पौडेल | Computer Engineer र Student Leader">',
);
html = html.replace(
  /<meta name="twitter:description" content="[^"]*">/,
  '<meta name="twitter:description" content="AI/ML, software development र student leadership मा सक्रिय Computer Engineer बिशाल बिक्रम पौडेलको portfolio।">',
);
html = html.replace(
  /(<button[^>]*id="language-toggle"[^>]*>)[\s\S]*?(<\/button>)/,
  '$1English$2',
);
html = html.replace(
  /(<button[^>]*id="theme-toggle"[^>]*aria-label=")[^"]*(")/,
  '$1गाढा मोड खोल्नुहोस्$2',
);
html = html.replace(
  '<span id="theme-label">Dark</span>',
  '<span id="theme-label">गाढा</span>',
);

await mkdir(new URL("dist/ne/", root), { recursive: true });
await writeFile(outputPath, html);
