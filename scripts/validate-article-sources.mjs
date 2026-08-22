import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "vite";

const ROOT = process.cwd();
const slug =
  process.argv[2] || readFileSync(resolve(ROOT, ".generated-article-slug"), "utf8").trim();
const MIN_SOURCES = 3;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BODY_CHARS = 500_000;

const TRUSTED_DOMAINS = [
  "who.int",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "medlineplus.gov",
  "cdc.gov",
  "nhs.uk",
  "mayoclinic.org",
  "clevelandclinic.org",
  "urologyhealth.org",
  "apa.org",
  "bmj.com",
  "jamanetwork.com",
  "nejm.org",
  "nature.com",
  "springer.com",
  "sciencedirect.com",
  "wiley.com",
  "frontiersin.org",
  "cochranelibrary.com",
  "thelancet.com",
  "harvard.edu",
  "hopkinsmedicine.org",
  "msdmanuals.com",
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "health",
  "medical",
  "guide",
  "في",
  "من",
  "على",
  "إلى",
  "عن",
  "مع",
  "هذا",
  "هذه",
  "التي",
  "الذي",
  "دليل",
  "صحة",
]);

function isTrustedHostname(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return TRUSTED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function textTokens(value) {
  return String(value)
    .toLowerCase()
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^ال/u, ""))
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function readableText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function verifyClaimSupport(article, evidence) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for claim-to-source validation");

  const prompt = `Act as a strict medical citation auditor. Compare the Arabic article with the
fetched excerpts from its cited sources. Return JSON only in this exact shape:
{"supported":boolean,"unsupportedClaims":["..."],"reason":"..."}
Set supported=false when a medical mechanism, benefit, risk, dosage, contraindication, or factual
health claim is not supported by at least one excerpt. Marketing sentences and general disclaimers
do not require citations. Do not use outside knowledge; judge only against the evidence below.

ARTICLE TITLE:\n${article.title}\n
ARTICLE:\n${article.content.slice(0, 24000)}\n
EVIDENCE:\n${evidence
    .map(
      (item, index) =>
        `SOURCE ${index + 1}: ${item.source.title}\nURL: ${item.source.url}\n${item.text.slice(0, 10000)}`,
    )
    .join("\n\n")}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    },
  );
  if (!response.ok) throw new Error(`Claim-support verifier failed with HTTP ${response.status}`);
  const payload = await response.json();
  const raw = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Claim-support verifier returned no result");
  const verdict = JSON.parse(raw);
  if (verdict.supported !== true || (verdict.unsupportedClaims?.length ?? 0) > 0) {
    throw new Error(
      `Unsupported medical claims: ${(verdict.unsupportedClaims ?? []).join(" | ") || verdict.reason}`,
    );
  }
  console.log("✓ Article claims are supported by the fetched source excerpts");
}

async function fetchSource(source) {
  let parsed;
  try {
    parsed = new URL(source.url);
  } catch {
    throw new Error(`Invalid source URL: ${source.url}`);
  }
  if (parsed.protocol !== "https:" || !isTrustedHostname(parsed.hostname)) {
    throw new Error(`Untrusted source domain: ${parsed.hostname}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(parsed, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "ElysrMedical-SourceValidator/1.0 (+https://elysrmedical.store)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${source.url}`);

    const finalUrl = new URL(response.url || source.url);
    if (!isTrustedHostname(finalUrl.hostname)) {
      throw new Error(`Source redirected to untrusted domain: ${finalUrl.hostname}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/(text\/html|text\/plain|application\/xhtml\+xml)/i.test(contentType)) {
      throw new Error(`Unsupported content type "${contentType}" for ${source.url}`);
    }
    const body = (await response.text()).slice(0, MAX_BODY_CHARS);
    if (body.length < 300) throw new Error(`Source page is too short or blocked: ${source.url}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  plugins: [],
  logLevel: "silent",
});

try {
  const { articles } = await vite.ssrLoadModule("/src/data/articles.ts");
  const article = articles.find((entry) => entry.slug === slug);
  if (!article) throw new Error(`Generated article not found: ${slug}`);
  if (!Array.isArray(article.sources) || article.sources.length < MIN_SOURCES) {
    throw new Error(`Article ${slug} needs at least ${MIN_SOURCES} trusted sources`);
  }

  const duplicateUrls = article.sources
    .map((source) => source.url)
    .filter((url, index, urls) => urls.indexOf(url) !== index);
  if (duplicateUrls.length) throw new Error(`Duplicate source URLs: ${duplicateUrls.join(", ")}`);

  const sourceEvidence = [];
  for (const source of article.sources) {
    if (!source.title || !source.publisher)
      throw new Error(`Incomplete source metadata: ${source.url}`);
    const page = await fetchSource(source);
    const pageTokens = new Set(textTokens(page));
    const titleTokens = textTokens(source.title);
    const titleMatches = titleTokens.filter((token) => pageTokens.has(token)).length;

    // A live trusted URL alone is insufficient: its page must resemble the cited title.
    if (titleTokens.length >= 2 && titleMatches < Math.min(2, titleTokens.length)) {
      throw new Error(`Source title is not supported by the fetched page: ${source.url}`);
    }
    sourceEvidence.push({ source, text: readableText(page) });
    console.log(`✓ ${source.publisher}: ${source.url}`);
  }

  await verifyClaimSupport(article, sourceEvidence);
  console.log(`✅ ${article.sources.length} live trusted sources validated for ${slug}`);
} finally {
  await vite.close();
}
