# Site purpose

This repository builds and publishes `https://ligfil-8110.github.io/` with Pelican and GitHub Pages.
Operate it as a long-term, reader-first publishing project whose eventual recurring revenue exceeds the owner's ChatGPT/Codex cost.

The primary target is monthly net revenue of JPY 30,000. Milestones are monthly JPY 5,000, 15,000, 30,000, and 50,000.
Treat profit as the primary KPI; traffic is useful only when it supports durable reader value and revenue.
Do not pursue misleading SEO, accidental ad clicks, clickbait that the article does not satisfy, or low-value AI article volume.

# Responsibilities

Automate repository auditing, planning, drafting, code and template work, internal links, revenue paths, testing, and deployment where access permits.
Ask the owner only for actions that require their identity, account approval, purchase, private analytics data, or first-hand experience that is not already documented.
Proceed without confirmation for reversible, low-risk SEO, content, template, monetization, performance, testing, Git, and deployment work.
Require owner action only for identity verification, new paid or contractual services, purchases, banking/tax/payment data, account-console actions that cannot be automated, legal decisions that cannot be made safely, or irreversible bulk deletion.

# Content rules

- Choose a specific search intent and reader outcome before drafting a search-focused article.
- Prefer topics supported by the owner's actual devices, play data, photos, measurements, problems, and solutions.
- Never invent ownership, hands-on experience, test results, prices, specifications, quotes, or performance measurements.
- Clearly separate verified facts, the owner's observations, and editorial inference.
- Preserve the owner's natural Japanese voice, including casual phrasing, enthusiasm, humor, and personal asides. Do not homogenize existing articles into polished, generic, or obviously AI-written prose.
- Prefer small, purpose-specific edits over full rewrites. Unless the owner explicitly requests a rewrite, keep unaffected sentences and structure intact and limit changes to factual corrections, clarity problems, SEO metadata, broken links, or other concrete issues.
- Avoid stock AI phrasing, repetitive summaries, excessive caveats, mechanical heading structures, and formulaic introductions. Read neighboring articles before editing so additions sound like the same author.
- Use descriptive Japanese titles and headings. Answer the main query early, then provide evidence, steps, caveats, and a concise conclusion.
- Add a unique `Title`, `Date`, `Category`, `Tags`, `Slug`, and `Summary` metadata block to every article. Add `Modified` when materially updating an older article.
- Preserve existing public slugs. If a slug must change, implement and verify a redirect before release.
- Link naturally to relevant existing articles. Do not create repetitive or keyword-stuffed links.
- Consolidate overlapping thin posts when this improves usefulness, preserving indexed URLs with redirects or canonicals.
- Keep diary posts for the author's voice, but prioritize searchable PC/gadget problem-solving and game guide articles for growth.

# Monetization and policy

- Use AdSense primarily for informational/game traffic and relevant affiliate links primarily for PC/gadget purchase intent.
- Ads and affiliate links must be clearly distinguishable from editorial content. Use `rel="sponsored nofollow"` on paid links where appropriate.
- Recommend only relevant products; explain who they suit, limitations, and the basis for the recommendation.
- Keep `content/extra/ads.txt` valid and deployed at `/ads.txt`.
- Keep the privacy policy accurate for every active service, including Google AdSense, Google Analytics 4, affiliate programs, cookies or similar identifiers, and the contact form.
- Treat legal and platform-policy text as accuracy-sensitive. Verify current official requirements before substantive changes and do not claim legal advice.
- Show game publisher copyright notices only on pages that actually use the relevant copyrighted material. Do not place a Dragon Quest/Square Enix notice site-wide.
- Do not expose account secrets, private analytics exports, personal identifiers, EXIF location data, or affiliate credentials beyond public publisher IDs already required by the site.

# Technical conventions

- Source articles and pages live in `content/`; the custom theme lives in `themes/foundation/`.
- Production settings live in `publishconf.py`; shared/local settings live in `pelicanconf.py`.
- Deployment is handled by `.github/workflows/deploy.yml` from `main`.
- Treat `output/` and `.build-content/` as generated artifacts. Do not hand-edit generated HTML.
- Preserve unrelated and pre-existing working-tree changes. Inspect `git status` before editing and before committing.
- Avoid adding large original images when a suitably sized, privacy-clean derivative is sufficient. Keep useful first-party evidence while controlling page weight.
- Prefer accessible, semantic HTML, responsive layouts, meaningful image alt text, canonical URLs, useful metadata, and structured data that accurately describes visible content.
- Avoid new third-party scripts unless their business value and privacy cost are justified.

# Verification before release

For every material content or template change:

1. Build with the production configuration using a disposable content/output location when possible.
2. Confirm the build reports no missing metadata or template errors.
3. Check changed pages at mobile and desktop widths.
4. Verify internal links, local images, canonical URLs, page titles, descriptions, and relevant structured data.
5. Confirm AdSense, GA4, affiliate markup, `ads.txt`, sitemap, and policy links remain present where intended.
6. Confirm game copyright notices appear only on relevant pages.
7. Review `git diff` and do not commit generated or unrelated files accidentally.
8. After deployment, smoke-test the public home page, changed URLs, `/ads.txt`, and `/sitemap.xml`.

# Measurement and iteration

Use GA4, Google Search Console, AdSense, and affiliate reports when the owner provides access or exports.
Track changes by page and date, then evaluate impressions, clicks, CTR, average position, engaged visits, affiliate clicks/conversions, RPM, and revenue.
Prioritize improvements supported by query/page data; do not remove useful content solely because short-term traffic is low.
