"""Make the small list thumbnails (640x360 WebP) for the article header images.

Run after adding or changing a header image in articles/images/:

    npm run articles:thumbs

Every full image `<name>.webp` gets a `<name>-small.webp` beside it; the Articles list
uses the small one so a page of articles loads quickly, and the article page keeps the
full-size image. Needs Pillow (a development tool only; the site build does not).
"""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
WIDTH, HEIGHT = 640, 360


def main(directory=None):
    images = Path(directory) if directory else ROOT / 'articles' / 'images'
    made = 0
    for source in sorted(images.glob('*.webp')):
        if source.stem.endswith('-small'):
            continue
        target = source.with_name(source.stem + '-small.webp')
        with Image.open(source) as image:
            image.convert('RGB').resize((WIDTH, HEIGHT), Image.LANCZOS).save(target, 'WEBP', quality=78, method=6)
        print(f'{target.name}: {target.stat().st_size // 1024} KB')
        made += 1
    print(f'Made {made} thumbnail(s) in {images}')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
