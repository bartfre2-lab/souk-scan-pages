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
   languages. `NN` is only a sort tie-breaker (articles are listed newest
   first, then by `NN`) and is not part of the URL.
2. Start each file with front matter:

   ```markdown
   ---
   title: What price transparency means
   summary: One sentence shown on the list page and in search results.
   date: 2026-11-30
   reading time: 5 min
   image_alt: Optional description (leave out if the picture is decorative)
   ---
   ```

   - `reading time` may be `5`, `5 min` or `5 min read`; only the number is
     used, and the page shows it in the reader's language.
   - The header image is optional. Add `articles/images/<slug>.webp` (for
     example `price-transparency.webp`) and the build uses it automatically on
     the list and article pages; until then the pages simply show no image.
     Expected: **WebP, 1280 x 720 (16:9), under 150 KB**, one file shared by all
     three languages (JPG or PNG with the same name also work; the build rejects
     anything under 640 px wide, not about 16:9, or over 150 KB). Put a different
     file name in `image:` only if you do not want to use the slug.
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
`https://soukscan.online/assets/articles/<image file name>`, which is the image
link the admin dashboard needs. The News tab limits titles to 120 characters and
text to 4,000 characters per language; the build prints a warning for any
article that is longer, because an article of about 1,000 words usually is.
