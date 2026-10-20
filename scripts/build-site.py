"""Build crawlable, localized static pages without a runtime translation dependency."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
import argparse, json, re, shutil, base64

ROOT = Path(__file__).resolve().parent.parent
LANGUAGES = ('en', 'fr', 'ar')
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class LocalizedHTML(HTMLParser):
    def __init__(self, catalog):
        super().__init__(convert_charrefs=True)
        self.catalog, self.parts, self.in_head = catalog, [], False
    def translate(self, value):
        key = ' '.join(value.split())
        if not key or not any(c.isalpha() for c in key): return value
        if key in ('SOUK-SCAN',): return value
        if key not in self.catalog['strings']: raise ValueError('Missing translation: '+key)
        return self.catalog['strings'][key]
    def handle_decl(self, value): self.parts.append('<!'+value+'>')
    def handle_starttag(self, tag, attrs):
        if tag == 'head': self.in_head = True
        pairs=[]
        for key,value in attrs:
            if value is not None and key in ('alt','aria-label'):
                value=self.translate(value)
            pairs.append(key if value is None else key+'="'+escape(value,quote=True)+'"')
        self.parts.append('<'+tag+(' '+' '.join(pairs) if pairs else '')+'>')
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID: self.parts.append('</'+tag+'>')
    def handle_endtag(self, tag):
        if tag not in VOID:self.parts.append('</'+tag+'>')
        if tag=='head':self.in_head=False
    def handle_data(self, text):
        if self.in_head: self.parts.append(escape(text));return
        key=' '.join(text.split())
        if not key:self.parts.append(text);return
        value=self.translate(text)
        self.parts.append((' ' if text[:1].isspace() else '')+escape(value)+(' ' if text[-1:].isspace() else ''))
    def handle_comment(self,text):self.parts.append('<!--'+text+'-->')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--out-dir',default='dist')
    parser.add_argument('--base',default='/')
    parser.add_argument('--preview',action='store_true')
    parser.add_argument('--asset-version',default='')
    args=parser.parse_args()
    base='/'+args.base.strip('/')+'/' if args.base.strip('/') else '/'
    out=ROOT/args.out_dir
    resolved=out.resolve()
    protected=[ROOT/name for name in ('app','preview','public','assets','locales','data','scripts','tests','docs','downloads','.git','node_modules','.github')]
    if any(resolved==p.resolve() or resolved.is_relative_to(p.resolve()) for p in protected) or resolved in (ROOT.resolve(),ROOT.parent.resolve()):
        raise ValueError('Unsafe output directory')
    if args.asset_version and not re.fullmatch(r'[A-Za-z0-9_-]+',args.asset_version):
        raise ValueError('Invalid asset version')
    out.mkdir(parents=True,exist_ok=True)
    if base=='/':
        # Static app/review releases are maintained independently. Only their
        # built files, domain verification and retained browser-cache assets ship.
        for directory in ('app','preview','public'):
            source=ROOT/directory
            if source.is_dir():shutil.copytree(source,out if directory=='public' else out/directory,dirs_exist_ok=True)
        for name in ('CNAME','google7e57ca047c540b15.html'):
            if (ROOT/name).is_file():shutil.copy2(ROOT/name,out/name)
        (out/'.nojekyll').write_text('')
    versions={name:name.rsplit('.',1)[0]+'-'+args.asset_version+'.'+name.rsplit('.',1)[1] for name in ('landing.js','site.js','landing.css','courtyard.css','souk-world.css','site.css','market-prices.js')} if args.asset_version else {}
    for directory in ('assets','downloads'):
        (out/directory).mkdir(parents=True,exist_ok=True)
        for entry in (ROOT/directory).iterdir():
            destination=out/directory/(versions.get(entry.name,entry.name) if directory=='assets' else entry.name)
            if entry.is_dir():shutil.copytree(entry,destination,dirs_exist_ok=True)
            elif entry.suffix=='.js' and versions:
                content=entry.read_text()
                for original,versioned in versions.items():content=content.replace('./'+original,'./'+versioned)
                destination.write_text(content)
            else:shutil.copy2(entry,destination)
    catalogs={lang:json.loads((ROOT/'locales'/f'{lang}.json').read_text()) for lang in LANGUAGES}
    legal={lang:json.loads((ROOT/'locales'/f'legal-{lang}.json').read_text()) for lang in LANGUAGES}
    origin='https://soukscan.online'
    market_data=json.loads((ROOT/'data/market.json').read_text())
    client_key=market_data['config']['key']
    if not client_key.startswith('sb_publishable_'):
        claims_part=client_key.split('.')[1]
        claims=json.loads(base64.urlsafe_b64decode(claims_part+'='*(-len(claims_part)%4)))
        if claims.get('role')!='anon':raise ValueError('Only a public anon/publishable client key may be shipped')
    def route(lang,section=''):
        return base+('' if lang=='en' else lang+'/')+(section+'/' if section else '')
    def controls(lang,section):
        links=''.join(f'<a href="{route(code,section)}" lang="{code}" hreflang="{code}"'+(' aria-current="page"' if code==lang else '')+'>'+label+'</a>' for code,label in [('en','English'),('fr','Français'),('ar','العربية')])
        common=catalogs[lang]['common']
        return f'<div class="site-controls"><nav aria-label="{escape(common["languageLabel"])}">{links}</nav><button class="theme-toggle" hidden type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/></svg><span>{escape(common["darkMode"])}</span></button></div>'
    boot="""(()=>{try{let t=localStorage.getItem('soukscan.website.theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})();"""
    def head(lang,section,title,description):
        url=origin+route(lang,section)
        alternates=''.join(f'<link rel="alternate" hreflang="{code}" href="{origin+route(code,section)}">' for code in LANGUAGES)
        return f'''<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f4ee"><title>{escape(title)}</title><meta name="description" content="{escape(description,quote=True)}"><meta name="robots" content="{'noindex, nofollow' if args.preview else 'index, follow'}"><link rel="canonical" href="{url}">{alternates}<link rel="alternate" hreflang="x-default" href="{origin+route('en',section)}"><meta property="og:type" content="website"><meta property="og:title" content="{escape(title,quote=True)}"><meta property="og:description" content="{escape(description,quote=True)}"><meta property="og:url" content="{url}"><meta property="og:locale" content="{dict(en='en_GB',fr='fr_MA',ar='ar_MA')[lang]}"><meta property="og:image" content="{origin+base}assets/brand/logo.png"><meta name="twitter:card" content="summary"><link rel="icon" href="{base}assets/brand/logo.png"><script>{boot}</script><link rel="preload" href="{base}assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="{base}assets/landing.css"><link rel="stylesheet" href="{base}assets/courtyard.css"><link rel="stylesheet" href="{base}assets/souk-world.css"><link rel="stylesheet" href="{base}assets/site.css"><script defer src="{base}assets/site.js"></script></head>'''
    def payload(lang,section):
        data={'language':lang,'common':catalogs[lang]['common'],'market':catalogs[lang]['market'],'prices':catalogs[lang]['prices'],'priceConfig':market_data['config'],'regions':market_data['regions']}
        return '<script id="site-copy" type="application/json">'+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+'</script>'
    def footer(lang):
        common=catalogs[lang]['common']
        return '<footer class="legal-footer"><a href="'+route(lang)+'">SOUK-SCAN</a>'+''.join(f'<a href="{route(lang,key)}">{escape(common[key])}</a>' for key in ('privacy','terms','account-deletion','support'))+'</footer>'
    def save(lang,section,body,title,description,home=False):
        # Keep the Latin brand readable inside both RTL and LTR headings.
        body=re.sub(r'(<h[1-6]\b[^>]*>)(.*?)(</h[1-6]>)',lambda m:m[1]+m[2].replace('SOUK-SCAN','<bdi class="brand-inline">SOUK-SCAN</bdi>')+m[3],body,flags=re.S)
        document=f'<!doctype html><html lang="{lang}" dir="{"rtl" if lang=="ar" else "ltr"}">'+head(lang,section,title,description)+body+payload(lang,section)+('</body></html>')
        for original,versioned in versions.items():document=document.replace(base+'assets/'+original,base+'assets/'+versioned)
        path=out/('' if lang=='en' else lang)/(section if section else '')/'index.html'
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text(document)
    template=(ROOT/'index.html').read_text()
    for lang in LANGUAGES:
        catalog=catalogs[lang]
        translated=LocalizedHTML(catalog);translated.feed(template)
        body=''.join(translated.parts).split('<body>',1)[1].rsplit('</body>',1)[0]
        body=body.replace('href="./"','href="'+route(lang)+'"')
        for section in ('privacy','terms','account-deletion','support'):
            body=body.replace(f'href="./{section}/"',f'href="{route(lang,section)}"')
        body=body.replace('href="./app/"','href="/app/"')
        body=body.replace('./assets/',base+'assets/').replace('./downloads/',base+'downloads/')
        body=body.replace('<!--header-controls-->',controls(lang,''),1)
        body=body.replace('assets/app-welcome-en.png',f'assets/app-welcome-{lang}.png')
        body='<body>'+body+f'<script type="module" src="{base}assets/landing.js"></script>'
        schema={'@context':'https://schema.org','@type':'SoftwareApplication','name':'SOUK-SCAN','applicationCategory':'LifestyleApplication','operatingSystem':'Android, Web','inLanguage':lang,'url':origin+route(lang),'description':catalog['meta']['description'],'isAccessibleForFree':True,'offers':{'@type':'Offer','price':'0','priceCurrency':'MAD'}}
        body+='<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>'
        save(lang,'',body,catalog['meta']['title'],catalog['meta']['description'],True)
        for section,page in legal[lang].items():
            content=''.join('<section><h2>'+escape(item['title'])+'</h2>'+''.join('<p>'+text+'</p>' for text in item['paragraphs'])+'</section>' for item in page['sections'])
            body=f'<body class="legal-page"><a class="skip-link" href="#main-content">{escape(catalog["common"]["skipContent"])}</a><header class="site-header wrap"><a class="brand" href="{route(lang)}"><img src="{base}assets/brand/logo.png" alt="" width="44" height="44"><span class="scanner-wordmark">[SOUK-SCAN]</span></a>{controls(lang,section)}<a class="text-link" href="{route(lang)}">{escape(catalog["common"]["backHome"])}</a></header>'+f'<main class="legal-content" id="main-content" tabindex="-1"><p class="eyebrow">SOUK-SCAN</p><h1>{escape(page["title"])}</h1><p class="legal-updated">{escape(page["updated"])}</p><p class="legal-summary">{page["intro"]}</p>{content}'+footer(lang)+'</main>'
            for key in ('privacy','terms','account-deletion','support'):body=body.replace('@@'+key+'@@',route(lang,key))
            save(lang,section,body,page['title']+' — SOUK-SCAN',page['description'])
    urls=[origin+route(lang,section) for lang in LANGUAGES for section in ('','privacy','terms','account-deletion','support')]
    sitemap='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+escape(url)+'</loc><lastmod>2026-10-20</lastmod></url>' for url in urls)+'</urlset>'
    (out/'sitemap.xml').write_text(sitemap)
    (out/'robots.txt').write_text('User-agent: *\nDisallow: '+base+'\n' if args.preview else 'User-agent: *\nAllow: /\nSitemap: '+origin+base+'sitemap.xml\n')
    print(f'Built 15 localized pages in {out}, base {base}, preview={args.preview}')

if __name__=='__main__':main()
