"""Fail deployment if the generated production artifact is incomplete or unsafe."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parent))
import articles as article_source

ROOT = Path(__file__).resolve().parent.parent
PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.soukscan.app'
UNPUBLISHED_ROUTES = {'app', 'downloads', 'preview', 'test', 'tests', 'demo', 'demos', 'archive', 'archives'}


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def verify(out, version='', articles_dir=None):
    out = Path(out).resolve()
    errors = []
    articles_dir = Path(articles_dir) if articles_dir else ROOT / 'articles'
    # Production never contains drafts, so expectations come from the source
    # articles: published ones must be present, drafts must be absent.
    published = article_source.load_articles(articles_dir)
    published_slugs = {item['slug'] for item in published}
    draft_slugs = {item['slug'] for item in article_source.load_articles(articles_dir, include_drafts=True)} - published_slugs
    article_sections = (['articles'] + ['articles/' + item['slug'] for item in published]) if published else []

    def require(condition, message):
        if not condition:
            errors.append(message)

    def digest(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    for name in ('.git', '.github', '.env', '.env.local', 'node_modules',
                 'locales', 'data', 'scripts', 'tests', 'docs', 'package.json', 'package-lock.json'):
        require(not (out / name).exists(), 'Source/private file in artifact: ' + name)
    allowed_html = {Path('404.html'), Path('google7e57ca047c540b15.html')}
    for language in ('', 'fr', 'ar'):
        for section in ('', 'privacy', 'terms', 'account-deletion', 'support', *article_sections):
            allowed_html.add(Path(language) / section / 'index.html')
    for path in out.rglob('*'):
        require(not path.is_symlink(), 'Symlink in deployment artifact: ' + str(path))
        require(not path.name.startswith('.env'), 'Environment file in artifact: ' + str(path))
        require(path.suffix.lower() not in ('.apk', '.aab', '.ipa', '.apks', '.xapk'),
                'Packaged app binary in artifact: ' + str(path))
        relative = path.relative_to(out)
        require(not any(part.lower() in UNPUBLISHED_ROUTES for part in relative.parts),
                'Unpublished test/review route in artifact: ' + str(relative))
        if path.suffix.lower() in ('.html', '.htm'):
            require(relative in allowed_html, 'Unapproved HTML page in artifact: ' + str(relative))
    require((out / '.nojekyll').is_file(), 'Missing .nojekyll')
    require((out / '404.html').is_file(), 'Missing unavailable-page response')
    expected_urls = set()
    for language in ('en', 'fr', 'ar'):
        prefix = '' if language == 'en' else language + '/'
        for section in ('', 'privacy/', 'terms/', 'account-deletion/', 'support/', *(name + '/' for name in article_sections)):
            route = '/' + prefix + section
            expected_urls.add('https://soukscan.online' + route)
            path = out / prefix / section / 'index.html'
            if not path.is_file():
                errors.append('Missing page: ' + route)
                continue
            text = path.read_text()
            tags = Page(text).tags
            require(('html', {'lang': language, 'dir': 'rtl' if language == 'ar' else 'ltr'}) in tags,
                    'Incorrect language/direction: ' + route)
            require(any(t == 'meta' and a.get('name') == 'robots' and a.get('content') == 'index, follow'
                        for t, a in tags), 'Production page is not indexable: ' + route)
            require(any(t == 'link' and a.get('rel') == 'canonical' and a.get('href') == 'https://soukscan.online' + route
                        for t, a in tags), 'Incorrect canonical: ' + route)
            for code in ('en', 'fr', 'ar', 'x-default'):
                lang_prefix = '' if code in ('en', 'x-default') else code + '/'
                require(any(t == 'link' and a.get('hreflang') == code and a.get('href') ==
                            'https://soukscan.online/' + lang_prefix + section for t, a in tags),
                        'Incorrect language alternate: ' + route + ' ' + code)
            for tag, attrs in tags:
                for key in ('href', 'src'):
                    value = attrs.get(key)
                    if not value:
                        continue
                    url = urlparse(value)
                    if url.scheme not in ('', 'http', 'https') or (url.netloc and url.netloc != 'soukscan.online'):
                        continue
                    if not url.path:
                        continue
                    target = (out / unquote(url.path).lstrip('/')).resolve()
                    require(target.is_relative_to(out) and target.exists(),
                            'Missing/unsafe target: ' + route + ' -> ' + value)
                    require(not any(part.lower() in UNPUBLISHED_ROUTES for part in Path(url.path).parts),
                            'Production link points to an unpublished page: ' + value)
            require('<!--header-controls-->' not in text, 'Unbuilt template: ' + route)
            require('data-article-draft' not in text, 'Draft article marker in production page: ' + route)
            require('<!--articles-' not in text, 'Unbuilt articles marker: ' + route)
            if section.startswith('articles/') and section != 'articles/':
                require(f'"@type":"Article"' in text.replace(' ', ''), 'Missing article structured data: ' + route)
            if version:
                require(f'/assets/site-{version}.js' in text, 'Wrong asset version: ' + route)

    try:
        urls = {e.text for e in ET.parse(out / 'sitemap.xml').findall('{*}url/{*}loc')}
        require(urls == expected_urls, f'Sitemap must contain exactly the {len(expected_urls)} production routes')
        robots = (out / 'robots.txt').read_text()
        require('Disallow: /' not in robots and 'Sitemap: https://soukscan.online/sitemap.xml' in robots,
                'Incorrect production robots.txt')
    except (OSError, ET.ParseError) as error:
        errors.append('Invalid SEO utility file: ' + str(error))

    # The app snapshot is a public build input, never rebuilt here.
    for directory in ('public/assets',):
        source = ROOT / directory
        require(source.is_dir(), 'Missing static input: ' + directory)
        for path in source.rglob('*'):
            if not path.is_file():
                continue
            relative = path.relative_to(source)
            target = out / 'assets' / relative if directory == 'public/assets' else out / directory / relative
            require(target.is_file() and digest(target) == digest(path),
                    'Static release/cache file changed or missing: ' + str(path.relative_to(ROOT)))
    for name in ('CNAME', 'google7e57ca047c540b15.html'):
        require((out / name).is_file() and digest(out / name) == digest(ROOT / name),
                'Domain/verification file changed or missing: ' + name)
    for prefix in ('', 'fr', 'ar'):
        home = out / prefix / 'index.html'
        if not home.is_file():continue
        text = home.read_text()
        tags = Page(text).tags
        store_links = [attrs.get('href') for tag, attrs in tags
                       if tag == 'a' and 'play-store-link' in attrs.get('class', '').split()]
        require(store_links == [PLAY_STORE_URL], 'Missing/incorrect primary Google Play link: /' + prefix)
        schemas = [json.loads(raw) for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', text, re.S)]
        require(any(schema.get('@type') == 'SoftwareApplication' and schema.get('installUrl') == PLAY_STORE_URL
                    and schema.get('operatingSystem') == 'Android' for schema in schemas),
                'Incorrect app availability metadata: /' + prefix)
        require(not any(tag == 'a' and 'download' in attrs for tag, attrs in tags),
                'Direct download link is forbidden: /' + prefix)

    for item in published:
        require((out / 'assets/articles' / item['image']).is_file(), 'Missing article image: ' + item['image'])
        for language in ('', 'fr', 'ar'):
            home = (out / language / 'index.html')
            require(home.is_file() and f'href="/{language + "/" if language else ""}articles/"' in home.read_text(),
                    'Home page does not link to the Articles section: /' + language)
    for slug in draft_slugs:
        for language in ('', 'fr', 'ar'):
            require(not (out / language / 'articles' / slug).exists(), 'Draft article in artifact: ' + slug)
    if not published:
        require(not any((out / language / 'articles').exists() for language in ('', 'fr', 'ar')),
                'Articles section published without any published article')

    for script in (out / 'assets').glob('*.js'):
        for name in re.findall(r'from\s+["\'](\./[^"\']+)["\']', script.read_text()):
            require((script.parent / name).is_file(), 'Missing JavaScript import: ' + name)
    if errors:
        raise ValueError('\n'.join(errors))
    return f'Verified {len(expected_urls)} production pages, SEO, assets/imports, cached assets and store-only app distribution'


if __name__ == '__main__':
    try:
        arguments = sys.argv[1:]
        articles_dir = None
        if '--articles-dir' in arguments:
            position = arguments.index('--articles-dir')
            articles_dir = arguments[position + 1]
            del arguments[position:position + 2]
        print(verify(arguments[0] if arguments else ROOT / 'dist-production',
                     arguments[1] if len(arguments) > 1 else '', articles_dir))
    except (ValueError, OSError) as error:
        print('Build verification failed:\n' + str(error), file=sys.stderr)
        sys.exit(1)
