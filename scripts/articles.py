"""Read Markdown articles into validated, safe HTML. Standard library only.

Authoring format (see articles/README.md): one file per article and language,
named ``[NN-]slug.<en|fr|ar>.md``, with a short front-matter block. Raw HTML in
Markdown is always escaped, and only http(s), mailto, relative and anchor links
are accepted, so an article can never inject markup or scripts into the site.
"""
from html import escape
from pathlib import Path
import re
import sys

LANGUAGES = ('en', 'fr', 'ar')
FILENAME = re.compile(r'^(?:(\d+)-)?([a-z0-9]+(?:-[a-z0-9]+)*)\.(en|fr|ar)\.md$')
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
IMAGE_EXTENSIONS = ('.webp', '.jpg', '.jpeg', '.png')
MAX_IMAGE_BYTES = 200 * 1024
# The News tab stores titles/text with these limits (SOUK-SCAN app, SPEC 20a).
NEWS_TITLE_LIMIT, NEWS_TEXT_LIMIT = 120, 4000

# Front-matter spellings accepted for each field (compared lower-case, with
# spaces, hyphens and underscores removed).
FIELD_ALIASES = {
    'title': 'title', 'summary': 'summary', 'date': 'date',
    'readingtime': 'reading_time', 'readtime': 'reading_time', 'minutes': 'reading_time',
    'image': 'image', 'imagealt': 'image_alt', 'alt': 'image_alt',
    'draft': 'draft', 'status': 'status',
}


class Article:
    """One language version of one article."""

    def __init__(self, **fields):
        self.__dict__.update(fields)


def _field(key):
    return FIELD_ALIASES.get(re.sub(r'[\s_-]+', '', key.lower()))


def split_front_matter(text, name='article'):
    """Return (raw key/value pairs, body). Accepts a ``---`` fenced block, or a
    leading block of ``key: value`` lines ended by a blank line."""
    text = text.lstrip('﻿').replace('\r\n', '\n').replace('\r', '\n')
    lines = text.split('\n')
    pairs, index = [], 0
    if lines and lines[0].strip() == '---':
        end = next((i for i in range(1, len(lines)) if lines[i].strip() == '---'), None)
        if end is None:
            raise ValueError(f'{name}: front matter opened with --- but never closed')
        block, index = lines[1:end], end + 1
    else:
        end = next((i for i, line in enumerate(lines) if not line.strip()), len(lines))
        block, index = lines[:end], end
    for line in block:
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        key, separator, value = line.partition(':')
        if not separator or not key.strip():
            raise ValueError(f'{name}: front matter line is not "key: value": {line!r}')
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in '"\'':
            value = value[1:-1]
        pairs.append((key.strip(), value))
    if not any(_field(key) == 'title' for key, _ in pairs):
        raise ValueError(f'{name}: missing front matter (title, summary, date, reading time)')
    return pairs, '\n'.join(lines[index:]).strip('\n')


# ---------------------------------------------------------------- Markdown

def safe_url(url, name='article'):
    url = url.strip()
    if re.match(r'^(https?://|mailto:|/|#)', url, re.I) and not re.search(r'[\s<>"]', url):
        return url
    raise ValueError(f'{name}: link not allowed (use http, https, mailto, / or #): {url!r}')


def inline(text, name='article'):
    """Escape, then apply bold, italic, code and links."""
    stash = []

    def keep(html):
        stash.append(html)
        return f'\x00{len(stash) - 1}\x00'

    text = re.sub(r'`([^`\n]+)`', lambda m: keep('<code>' + escape(m[1]) + '</code>'), text)

    def make_link(label_html, url):
        url = safe_url(url, name)
        attrs = ' rel="noopener noreferrer"' if re.match(r'https?://', url, re.I) else ''
        return keep(f'<a href="{escape(url, quote=True)}"{attrs}>{label_html}</a>')

    text = re.sub(r'\[([^\]\n]+)\]\(([^)\s]+)\)', lambda m: make_link(inline(m[1], name), m[2]), text)
    text = re.sub(r'<(https?://[^>\s]+)>', lambda m: make_link(escape(m[1]), m[1]), text)
    text = escape(text, quote=False)
    text = re.sub(r'\*\*(?=\S)(.+?)(?<=\S)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<![\w*])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![\w*])', r'<em>\1</em>', text)
    text = re.sub(r'(?<!\w)_(?=\S)([^_\n]+?)(?<=\S)_(?!\w)', r'<em>\1</em>', text)
    return re.sub(r'\x00(\d+)\x00', lambda m: stash[int(m[1])], text)


def slugify(text):
    return re.sub(r'[\s_]+', '-', re.sub(r'[^\w\s-]', '', text, flags=re.U).strip().lower()) or 'section'


def markdown(body, title='', name='article'):
    """Convert the supported Markdown subset to HTML. Headings start at h2
    because the article title is the page's single h1."""
    html, ids = [], set()
    lines = body.split('\n')
    i, first_block = 0, True

    def heading_id(text):
        base = slugify(re.sub(r'[*_`\[\]()]', '', text)) or 'section'
        candidate, n = base, 2
        while candidate in ids:
            candidate, n = f'{base}-{n}', n + 1
        ids.add(candidate)
        return candidate

    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        fence = re.match(r'^```', line)
        heading = re.match(r'^(#{1,6})\s+(.+?)\s*#*\s*$', line)
        if fence:
            code, i = [], i + 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.append(lines[i]); i += 1
            html.append('<pre><code>' + escape('\n'.join(code)) + '</code></pre>')
            i += 1
        elif heading:
            level, text = len(heading[1]), heading[2].strip()
            i += 1
            if first_block and level == 1 and text == title.strip():
                first_block = False
                continue  # The page already renders the title as its h1.
            rendered = inline(text, name)
            level = min(max(level, 2), 4)
            html.append(f'<h{level} id="{heading_id(text)}">{rendered}</h{level}>')
        elif re.match(r'^\s*([-*_])(\s*\1){2,}\s*$', line):
            html.append('<hr>')
            i += 1
        elif line.startswith('>'):
            quote = []
            while i < len(lines) and lines[i].startswith('>'):
                quote.append(lines[i][1:].lstrip()); i += 1
            html.append('<blockquote>' + markdown('\n'.join(quote), '', name) + '</blockquote>')
        elif re.match(r'^\s*([-*+]|\d+[.)])\s+', line):
            ordered = bool(re.match(r'^\s*\d+[.)]\s+', line))
            items = []
            while i < len(lines) and lines[i].strip():
                match = re.match(r'^\s*(?:[-*+]|\d+[.)])\s+(.*)$', lines[i])
                if match:
                    items.append(match[1])
                elif items and lines[i][:1].isspace():
                    items[-1] += ' ' + lines[i].strip()
                else:
                    break
                i += 1
            tag = 'ol' if ordered else 'ul'
            html.append(f'<{tag}>' + ''.join(f'<li>{inline(item, name)}</li>' for item in items) + f'</{tag}>')
        else:
            paragraph = []
            while i < len(lines) and lines[i].strip() and not BLOCK_START.match(lines[i]):
                paragraph.append(lines[i].strip()); i += 1
            html.append('<p>' + inline('\n'.join(paragraph).replace('\n', ' '), name) + '</p>')
        first_block = False
    return '\n'.join(html)


BLOCK_START = re.compile(r'^(#{1,6}\s|```|>|\s*([-*+]|\d+[.)])\s+|\s*([-*_])(\s*[-*_]){2,}\s*$)')


def plain_text(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html)).strip()


# ---------------------------------------------------------------- images

def image_size(path):
    """(width, height) of a WebP, PNG or JPEG file without extra dependencies."""
    data = Path(path).read_bytes()
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        kind = data[12:16]
        if kind == b'VP8 ':
            return (int.from_bytes(data[26:28], 'little') & 0x3fff, int.from_bytes(data[28:30], 'little') & 0x3fff)
        if kind == b'VP8L':
            bits = int.from_bytes(data[21:25], 'little')
            return ((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1)
        if kind == b'VP8X':
            return (int.from_bytes(data[24:27], 'little') + 1, int.from_bytes(data[27:30], 'little') + 1)
    if data[:8] == b'\x89PNG\r\n\x1a\n':
        return int.from_bytes(data[16:20], 'big'), int.from_bytes(data[20:24], 'big')
    if data[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xff:
                i += 1; continue
            marker = data[i + 1]
            if 0xc0 <= marker <= 0xcf and marker not in (0xc4, 0xc8, 0xcc):
                return int.from_bytes(data[i + 7:i + 9], 'big'), int.from_bytes(data[i + 5:i + 7], 'big')
            i += 2 + int.from_bytes(data[i + 2:i + 4], 'big')
    raise ValueError(f'{path}: not a readable WebP, PNG or JPEG image')


def check_image(directory, filename, slug):
    path = (Path(directory) / 'images' / filename)
    if Path(filename).name != filename or Path(filename).suffix.lower() not in IMAGE_EXTENSIONS:
        raise ValueError(f'{slug}: image must be a plain file name in articles/images/ ending in .webp, .jpg or .png: {filename!r}')
    if not path.is_file():
        raise ValueError(f'{slug}: image file not found: articles/images/{filename}')
    size = path.stat().st_size
    if size > MAX_IMAGE_BYTES:
        raise ValueError(f'{slug}: image is {size // 1024} KB; compress it below {MAX_IMAGE_BYTES // 1024} KB')
    width, height = image_size(path)
    if not 1.7 <= width / height <= 1.85 or width < 640:
        raise ValueError(f'{slug}: image must be about 16:9 and at least 640 px wide (found {width}x{height})')
    return path, width, height


# ---------------------------------------------------------------- loading

def parse_file(path):
    match = FILENAME.match(path.name)
    if not match:
        raise ValueError(f'{path.name}: article files must be named [NN-]slug.<en|fr|ar>.md')
    order, slug, lang = match[1], match[2], match[3]
    pairs, body = split_front_matter(path.read_text(encoding='utf-8'), path.name)
    fields = {}
    for key, value in pairs:
        field = _field(key)
        if field is None:
            print(f'warning: {path.name}: ignoring unknown front matter field "{key}"', file=sys.stderr)
        elif field in fields:
            raise ValueError(f'{path.name}: front matter field repeated: {key}')
        else:
            fields[field] = value
    for required in ('title', 'summary', 'date', 'reading_time'):
        if not fields.get(required):
            raise ValueError(f'{path.name}: missing front matter field: {required.replace("_", " ")}')
    if not DATE.match(fields['date']):
        raise ValueError(f'{path.name}: date must look like 2026-11-30')
    minutes = re.search(r'\d+', fields['reading_time'])
    if not minutes or not 1 <= int(minutes[0]) <= 60:
        raise ValueError(f'{path.name}: reading time must contain a number of minutes (1-60)')
    draft = fields.get('draft', '').lower() in ('true', 'yes', '1') or fields.get('status', '').lower() == 'draft'
    html = markdown(body, fields['title'], path.name)
    if not html.strip():
        raise ValueError(f'{path.name}: the article has no text')
    return Article(slug=slug, lang=lang, order=int(order) if order else 9999, title=fields['title'],
                   summary=fields['summary'], date=fields['date'], minutes=int(minutes[0]),
                   image=fields.get('image', '') or f'{slug}.webp', image_alt=fields.get('image_alt', ''),
                   draft=draft, html=html, text=plain_text(html), file=path.name)


def load_articles(directory, include_drafts=False):
    """Return a list of articles, newest first. Each is a dict:
    slug, order, date, draft, image, width, height, source and langs{lang: Article}.
    Every article must exist in all three languages."""
    directory = Path(directory)
    if not directory.is_dir():
        return []
    found = {}
    for path in sorted(directory.glob('*.md')):
        if path.name.lower() == 'readme.md':
            continue
        article = parse_file(path)
        found.setdefault(article.slug, {})[article.lang] = article
    result = []
    for slug, versions in found.items():
        draft = any(version.draft for version in versions.values())
        if draft and not include_drafts:
            continue
        missing = [lang for lang in LANGUAGES if lang not in versions]
        if missing:
            raise ValueError(f'{slug}: missing language version(s): {", ".join(missing)}')
        english = versions['en']
        image_name = english.image
        path, width, height = check_image(directory, image_name, slug)
        for version in versions.values():
            if version.image != image_name:
                raise ValueError(f'{slug}: the image must be the same in every language')
            if len(version.title) > NEWS_TITLE_LIMIT or len(version.text) > NEWS_TEXT_LIMIT:
                print(f'warning: {version.file}: {len(version.title)}-character title / {len(version.text)}-character text; '
                      f'the app News tab allows {NEWS_TITLE_LIMIT} / {NEWS_TEXT_LIMIT}', file=sys.stderr)
        result.append({'slug': slug, 'order': english.order, 'date': max(v.date for v in versions.values()),
                       'draft': draft, 'image': image_name, 'image_path': path, 'width': width, 'height': height,
                       'langs': versions})
    result.sort(key=lambda item: (item['date'], -item['order']), reverse=True)
    return result


# ---------------------------------------------------------------- labels

def format_date(iso, months):
    year, month, day = iso.split("-")
    return f"{int(day)} {months[int(month) - 1]} {year}"


def reading_label(copy, lang, minutes):
    """Localized "N min read"; Arabic needs its own plural forms."""
    if lang == "ar":
        form = "readingOne" if minutes == 1 else "readingTwo" if minutes == 2 else "readingFew" if minutes <= 10 else "readingMany"
    else:
        form = "readingOne" if minutes == 1 else "readingOther"
    return copy[form].replace("{count}", str(minutes))
