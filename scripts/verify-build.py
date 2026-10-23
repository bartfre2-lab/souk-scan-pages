"""Fail deployment if the generated production artifact is incomplete or unsafe."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import hashlib
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def verify(out, version=''):
    out = Path(out).resolve()
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    def digest(path):
        return hashlib.sha256(path.read_bytes()).hexdigest()

    for name in ('.git', '.github', '.env', '.env.local', 'node_modules',
                 'locales', 'data', 'scripts', 'tests', 'package.json', 'package-lock.json'):
        require(not (out / name).exists(), 'Source/private file in artifact: ' + name)
    for path in out.rglob('*'):
        require(not path.is_symlink(), 'Symlink in deployment artifact: ' + str(path))
        require(not path.name.startswith('.env'), 'Environment file in artifact: ' + str(path))
    require((out / '.nojekyll').is_file(), 'Missing .nojekyll')
    expected_urls = set()
    for language in ('en', 'fr', 'ar'):
        prefix = '' if language == 'en' else language + '/'
        for section in ('', 'privacy/', 'terms/', 'account-deletion/', 'support/'):
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
                    require(not url.path.startswith('/preview/souk/'),
                            'Production link points to website preview: ' + value)
            require('<!--header-controls-->' not in text, 'Unbuilt template: ' + route)
            if version:
                require(f'/assets/site-{version}.js' in text, 'Wrong asset version: ' + route)

    try:
        urls = {e.text for e in ET.parse(out / 'sitemap.xml').findall('{*}url/{*}loc')}
        require(urls == expected_urls, 'Sitemap must contain exactly the 15 production routes')
        robots = (out / 'robots.txt').read_text()
        require('Disallow: /' not in robots and 'Sitemap: https://soukscan.online/sitemap.xml' in robots,
                'Incorrect production robots.txt')
    except (OSError, ET.ParseError) as error:
        errors.append('Invalid SEO utility file: ' + str(error))

    # The app snapshot is a public build input, never rebuilt here.
    for directory in ('app', 'public'):
        source = ROOT / directory
        require(source.is_dir(), 'Missing static input: ' + directory)
        for path in source.rglob('*'):
            if not path.is_file():
                continue
            relative = path.relative_to(source)
            target = out / relative if directory == 'public' else out / directory / relative
            require(target.is_file() and digest(target) == digest(path),
                    'Static release/cache file changed or missing: ' + str(path.relative_to(ROOT)))
    for name in ('CNAME', 'google7e57ca047c540b15.html'):
        require((out / name).is_file() and digest(out / name) == digest(ROOT / name),
                'Domain/verification file changed or missing: ' + name)
    try:
        for line in (out / 'downloads/SHA256SUMS.txt').read_text().splitlines():
            checksum, filename = line.split()
            path = out / 'downloads' / filename
            # The AAB is Play-only; the hosted APK must match the signed release.
            if filename.endswith('.apk'):
                require(path.is_file() and digest(path) == checksum, 'APK checksum mismatch')
    except (OSError, ValueError) as error:
        errors.append('Invalid download checksums: ' + str(error))

    for script in (out / 'assets').glob('*.js'):
        for name in re.findall(r'from\s+["\'](\./[^"\']+)["\']', script.read_text()):
            require((script.parent / name).is_file(), 'Missing JavaScript import: ' + name)
    if errors:
        raise ValueError('\n'.join(errors))
    return 'Verified 15 production pages, SEO, assets/imports, static app, cached assets and signed APK'


if __name__ == '__main__':
    try:
        print(verify(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'dist-production',
                     sys.argv[2] if len(sys.argv) > 2 else ''))
    except (ValueError, OSError) as error:
        print('Build verification failed:\n' + str(error), file=sys.stderr)
        sys.exit(1)
