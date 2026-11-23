# Articles

Short educational articles for soukscan.online (`/articles/`, `/fr/articles/`,
`/ar/articles/`). Each article is plain Markdown, one file per language. The
existing build (`npm run build`) turns them into static pages; nothing else is
needed and no dependency was added (`scripts/articles.py` is standard-library
Python).

## Add an article

1. Write three files in this folder, named `[NN-]slug.<lang>.md`, for example
   `01-price-transparency.en.md`, `01-price-transparency.fr.md`,
   `01-price-transparency.ar.md`. The slug becomes the URL
   (`/articles/price-transparency/`) and must be identical in all three
   languages. `NN` is not part of the URL; it only orders articles with the
   same date (the higher `NN` counts as newer).
2. Start each file with front matter:

   ```markdown
   ---
   title: What price transparency means
   summary: One sentence shown on the list page and in search results.
   date: 2026-11-30
   reading time: 5 min
   topics: Understanding prices, Morocco
   image_alt: Optional description (leave out if the picture is decorative)
   ---
   ```

   - `reading time` may be `5`, `5 min` or `5 min read`; only the number is
     used, and the page shows it in the reader's language.
   - The header image is optional and **each language has its own**. Add
     `articles/images/<slug>.<lang>.webp` (for example
     `price-transparency.ar.webp`) and the build uses it automatically on that
     language's article page, social preview and structured data; a language
     without a file simply shows no image. A single `<slug>.webp` is used by any
     language that has no file of its own. Expected: **WebP, 1280 x 720 (16:9),
     under 150 KB** (JPG or PNG also work; the build rejects anything under
     640 px wide, not about 16:9, or over 150 KB). Use `image:` only to point at
     a file with a different name.
   - Small list thumbnails: `<name>-small.webp` (640 x 360, about 25 KB) next
     to a full image is used by the Articles list and the search results, so a
     page of articles loads quickly. After adding or changing an image run
     `npm run articles:thumbs` (needs Python with Pillow) to make them.
   - `topics` (optional, up to 5, comma-separated, written in that file's own
     language) become the filter buttons on the list page. Reuse the same label
     for articles on the same subject.
   - `draft: true` keeps the article out of the production build (see below).
   - The files written in the drafts folder (`title`, `summary`, `date`,
     `reading time`, with or without the `---` fences) are accepted as they are;
     rename them to match the pattern above if needed and add the image.
3. Body: `##`/`###` headings (the title is the page's `h1`; a leading `# Title`
   line equal to the title is dropped), paragraphs, `**bold**`, `*italic*`,
   `[links](https://…)`, `-` and `1.` lists, `>` quotes, `---` rules. Put
   the sources in a final `## Sources` list. Raw HTML is always escaped, and
   only `http(s)`, `mailto`, `/` and `#` links are accepted.
4. Run `npm test`. A published article must exist in English, French and
   Arabic; the build stops with a clear message if a language, image or
   front-matter field is missing.

## The list page

Articles are listed newest first (by `date`, then `NN`). The list is split into
static pages of 10 (`/articles/`, `/articles/page/2/`, ...) with Previous/Next
and numbered links, so it keeps working with hundreds of articles and without
JavaScript. For readers with JavaScript, a search box and the topic buttons
search all pages at once through a small per-language index
(`/articles/search-index.json`: title, summary and topics only). The page size is
`PAGE_SIZE` in `scripts/articles.py` (tests use `--articles-page-size`).

The Articles link appears in the header and footer only while at least one
non-draft article exists, so an empty section can never go live.

## Drafts

An article with `draft: true` (in any of its files) is skipped by every normal
and production build. To read drafts locally:

```sh
npm run dev:drafts
```

which builds into `dist-drafts/` (marked and `noindex`) and serves it on
port 4173. The build refuses `--drafts` for `dist-production`, and the artifact
check fails if a draft page or marker reaches the deployable output.
`00-sample-draft.*.md` is placeholder text that proves the pipeline; delete it
once real articles exist.

## Copying an article into the app's News tab

Each article's header image is published at
`https://soukscan.online/assets/articles/<image file name>` (for example
`.../price-transparency.fr.webp`), which is the image link the admin dashboard
needs; use the file of the language you are entering. The News tab limits
titles to 120 characters and text to 4,000 characters per language; the build prints a warning for any
article that is longer, because an article of about 1,000 words usually is.
