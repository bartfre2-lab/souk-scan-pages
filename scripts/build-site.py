"""Build crawlable, localized static pages without a runtime translation dependency."""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
import argparse, json, re, shutil, base64, sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
import articles as article_source

ROOT = Path(__file__).resolve().parent.parent
LANGUAGES = ('en', 'fr', 'ar')
PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.soukscan.app'
UNPUBLISHED_ROUTES = ('app', 'downloads', 'preview', 'test', 'tests', 'demo', 'demos', 'archive', 'archives')
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
    parser.add_argument('--drafts',action='store_true',help='Include articles marked draft (local review only; never for production)')
    parser.add_argument('--articles-dir',default='articles')
    parser.add_argument('--articles-page-size',type=int,default=article_source.PAGE_SIZE,help='Articles per list page')
    args=parser.parse_args()
    base='/'+args.base.strip('/')+'/' if args.base.strip('/') else '/'
    out=ROOT/args.out_dir
    resolved=out.resolve()
    protected=[ROOT/name for name in ('app','preview','public','assets','locales','data','scripts','tests','docs','downloads','.git','node_modules','.github')]
    if any(resolved==p.resolve() or resolved.is_relative_to(p.resolve()) for p in protected) or resolved in (ROOT.resolve(),ROOT.parent.resolve()):
        raise ValueError('Unsafe output directory')
    if args.asset_version and not re.fullmatch(r'[A-Za-z0-9_-]+',args.asset_version):
        raise ValueError('Invalid asset version')
    if args.articles_page_size<1:
        raise ValueError('Articles per page must be at least 1')
    if args.drafts and out.name=='dist-production':
        raise ValueError('Draft articles must never be built into dist-production')
    articles_dir=Path(args.articles_dir) if Path(args.articles_dir).is_absolute() else ROOT/args.articles_dir
    articles=article_source.load_articles(articles_dir,include_drafts=args.drafts)
    out.mkdir(parents=True,exist_ok=True)
    # Only generated output is cleaned. Local review sources and Git history
    # remain intact; stale review builds must never survive a production rebuild.
    for name in UNPUBLISHED_ROUTES:
        stale=out/name
        if stale.is_symlink() or stale.is_file():stale.unlink()
        elif stale.is_dir():shutil.rmtree(stale)
    if base=='/':
        # `public` is a cache-asset archive, not an additional page source.
        # Copy its asset subtree only, never arbitrary review HTML or routes.
        cached_assets=ROOT/'public/assets'
        if cached_assets.is_dir():shutil.copytree(cached_assets,out/'assets',dirs_exist_ok=True)
        for name in ('CNAME','google7e57ca047c540b15.html','404.html'):
            if (ROOT/name).is_file():shutil.copy2(ROOT/name,out/name)
        (out/'.nojekyll').write_text('')
    versions={name:name.rsplit('.',1)[0]+'-'+args.asset_version+'.'+name.rsplit('.',1)[1] for name in ('landing.js','site.js','articles.js','landing.css','courtyard.css','souk-world.css','site.css','market-prices.js')} if args.asset_version else {}
    for directory in ('assets',):
        (out/directory).mkdir(parents=True,exist_ok=True)
        for entry in (ROOT/directory).iterdir():
            destination=out/directory/(versions.get(entry.name,entry.name) if directory=='assets' else entry.name)
            if entry.is_dir():shutil.copytree(entry,destination,dirs_exist_ok=True)
            elif entry.suffix=='.js' and versions:
                content=entry.read_text()
                for original,versioned in versions.items():content=content.replace('./'+original,'./'+versioned)
                destination.write_text(content)
            else:shutil.copy2(entry,destination)
    for item in articles:
        for image in item['images'].values():
            if image:
                (out/'assets/articles').mkdir(parents=True,exist_ok=True)
                for file in (image,image['small']):
                    if file:shutil.copy2(file['path'],out/'assets/articles'/file['name'])
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
        return f'<div class="site-controls"><details class="language-menu"><summary aria-label="{escape(common["languageLabel"])}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18"/></svg><span>{dict(en="EN",fr="FR",ar="ع")[lang]}</span><svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></summary><nav aria-label="{escape(common["languageLabel"])}">{links}</nav></details><button class="theme-toggle" hidden type="button" aria-label="{escape(common["darkMode"])}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z"/></svg><span>{escape(common["darkMode"])}</span></button></div>'
    boot="""(()=>{try{let t=localStorage.getItem('soukscan.website.theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})();"""
    def head(lang,section,title,description,og_type='website',image='',noindex=False):
        url=origin+route(lang,section)
        alternates=''.join(f'<link rel="alternate" hreflang="{code}" href="{origin+route(code,section)}">' for code in LANGUAGES)
        return f'''<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f4ee"><title>{escape(title)}</title><meta name="description" content="{escape(description,quote=True)}"><meta name="robots" content="{'noindex, nofollow' if args.preview or noindex else 'index, follow'}"><link rel="canonical" href="{url}">{alternates}<link rel="alternate" hreflang="x-default" href="{origin+route('en',section)}"><meta property="og:type" content="{og_type}"><meta property="og:title" content="{escape(title,quote=True)}"><meta property="og:description" content="{escape(description,quote=True)}"><meta property="og:url" content="{url}"><meta property="og:locale" content="{dict(en='en_GB',fr='fr_MA',ar='ar_MA')[lang]}"><meta property="og:image" content="{image or origin+base+'assets/brand/logo.png'}"><meta name="twitter:card" content="{'summary_large_image' if image else 'summary'}"><link rel="icon" href="{base}assets/brand/favicon-128.png"><script>{boot}</script><link rel="preload" href="{base}assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="{base}assets/landing.css"><link rel="stylesheet" href="{base}assets/courtyard.css"><link rel="stylesheet" href="{base}assets/souk-world.css"><link rel="stylesheet" href="{base}assets/site.css"><script defer src="{base}assets/site.js"></script></head>'''
    def payload(lang,section):
        data={'language':lang,'common':catalogs[lang]['common'],'market':catalogs[lang]['market'],'prices':catalogs[lang]['prices'],'priceConfig':market_data['config'],'regions':market_data['regions']}
        return '<script id="site-copy" type="application/json">'+json.dumps(data,ensure_ascii=False).replace('<','\\u003c')+'</script>'
    def footer(lang):
        common=catalogs[lang]['common']
        return '<footer class="legal-footer"><a href="'+route(lang)+'">SOUK-SCAN</a>'+(f'<a href="{route(lang,"articles")}">{escape(catalogs[lang]["articles"]["navLabel"])}</a>' if articles else '')+''.join(f'<a href="{route(lang,key)}">{escape(common[key])}</a>' for key in ('privacy','terms','account-deletion','support'))+'</footer>'
    def save(lang,section,body,title,description,home=False,**head_options):
        # Keep the Latin brand readable inside both RTL and LTR headings.
        body=re.sub(r'(<h[1-6]\b[^>]*>)(.*?)(</h[1-6]>)',lambda m:m[1]+m[2].replace('SOUK-SCAN','<bdi class="brand-inline">SOUK-SCAN</bdi>')+m[3],body,flags=re.S)
        document=f'<!doctype html><html lang="{lang}" dir="{"rtl" if lang=="ar" else "ltr"}">'+head(lang,section,title,description,**head_options)+body+payload(lang,section)+('</body></html>')
        for original,versioned in versions.items():document=document.replace(base+'assets/'+original,base+'assets/'+versioned)
        path=out/('' if lang=='en' else lang)/(section if section else '')/'index.html'
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text(document)
    template=re.sub(r'<!--articles-start-->(.*?)<!--articles-end-->',(lambda m:m[1]) if articles else '',(ROOT/'index.html').read_text(),flags=re.S)
    for lang in LANGUAGES:
        catalog=catalogs[lang]
        translated=LocalizedHTML(catalog);translated.feed(template)
        body=''.join(translated.parts).split('<body>',1)[1].rsplit('</body>',1)[0]
        body=body.replace('href="./"','href="'+route(lang)+'"')
        for section in ('privacy','terms','account-deletion','support','articles'):
            body=body.replace(f'href="./{section}/"',f'href="{route(lang,section)}"')
        body=body.replace('./assets/',base+'assets/').replace('./downloads/',base+'downloads/')
        # The article pages reuse the home page's translated header and footer.
        home_header=re.search(r'<header class="site-header wrap">.*?</header>',body,re.S)[0].replace('href="#','href="'+route(lang)+'#')
        home_footer=re.search(r'<footer class="site-footer wrap">.*?</footer>',body,re.S)[0]
        body=body.replace('<!--header-controls-->',controls(lang,''),1)
        body=body.replace('assets/app-welcome-en.webp',f'assets/app-welcome-{lang}.webp')
        body='<body>'+body+f'<script type="module" src="{base}assets/landing.js"></script>'
        schema={'@context':'https://schema.org','@type':'SoftwareApplication','name':'SOUK-SCAN','applicationCategory':'LifestyleApplication','operatingSystem':'Android','inLanguage':lang,'url':origin+route(lang),'installUrl':PLAY_STORE_URL,'description':catalog['meta']['description'],'isAccessibleForFree':True,'offers':{'@type':'Offer','price':'0','priceCurrency':'MAD'}}
        body+='<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>'
        save(lang,'',body,catalog['meta']['title'],catalog['meta']['description'],True)
        for section,page in legal[lang].items():
            content=''.join('<section><h2>'+escape(item['title'])+'</h2>'+''.join('<p>'+text+'</p>' for text in item['paragraphs'])+'</section>' for item in page['sections'])
            body=f'<body class="legal-page"><a class="skip-link" href="#main-content">{escape(catalog["common"]["skipContent"])}</a><header class="site-header wrap"><a class="brand" href="{route(lang)}"><img src="{base}assets/brand/logo.webp" alt="" width="44" height="44"><span class="scanner-wordmark">[SOUK-SCAN]</span></a>{controls(lang,section)}<a class="text-link" href="{route(lang)}">{escape(catalog["common"]["backHome"])}</a></header>'+f'<main class="legal-content" id="main-content" tabindex="-1"><p class="eyebrow">SOUK-SCAN</p><h1>{escape(page["title"])}</h1><p class="legal-updated">{escape(page["updated"])}</p><p class="legal-summary">{page["intro"]}</p>{content}'+footer(lang)+'</main>'
            for key in ('privacy','terms','account-deletion','support'):body=body.replace('@@'+key+'@@',route(lang,key))
            save(lang,section,body,page['title']+' — SOUK-SCAN',page['description'])
        if articles:
            copy=catalog['articles']
            chevron='<svg class="icon-arrow icon-back" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>'
            def article_page(section,title,description,main,schema=None,**options):
                header=home_header.replace('<!--header-controls-->',controls(lang,section)).replace(f'<a href="{route(lang,"articles")}">',f'<a href="{route(lang,"articles")}" aria-current="page">',1)
                page=f'<body class="articles-page"><a class="skip-link" href="#main-content">{escape(catalog["common"]["skipContent"])}</a>{header}<main class="articles-main wrap" id="main-content" tabindex="-1">{main}</main>{home_footer}'
                if schema:page+='<script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>'
                save(lang,section,page,title,description,**options)
            def meta_line(version):
                return f'<p class="article-meta"><time datetime="{version.date}">{escape(article_source.format_date(version.date,copy["months"]))}</time><span aria-hidden="true">·</span><span>{escape(article_source.reading_label(copy,lang,version.minutes))}</span></p>'
            def image_url(item):return origin+base+'assets/articles/'+item['images'][lang]['name'] if item['images'][lang] else ''
            def row(item):
                version=item['langs'][lang]
                href=route(lang,'articles/'+item['slug'])
                badge=f'<p class="article-draft" data-article-draft>{escape(copy["draftNote"])}</p>' if item['draft'] else ''
                image=item['images'][lang]
                small=(image['small'] or image) if image else None
                thumb=f'<a class="article-thumb" href="{href}" tabindex="-1" aria-hidden="true"><img src="{base}assets/articles/{small["name"]}" alt="" width="{small["width"]}" height="{small["height"]}" loading="lazy" decoding="async"></a>' if image else ''
                return f'<li class="article-item{"" if image else " article-item--text"}">{thumb}<div class="article-item-body">{meta_line(version)}<h2><a href="{href}">{escape(version.title)}</a></h2><p>{escape(version.summary)}</p>{badge}</div></li>'
            size=args.articles_page_size
            total_pages=article_source.page_count(len(articles),size)
            def page_href(number):return route(lang,'articles' if number==1 else f'articles/page/{number}')
            def fill(template,**values):
                for key,value in values.items():template=template.replace('{'+key+'}',str(value))
                return template
            def pager(number):
                if total_pages==1:return ''
                arrow_back='<svg class="icon-arrow icon-back" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>'
                arrow_next='<svg class="icon-arrow icon-forward" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
                parts=[f'<a class="pager-step" rel="prev" href="{page_href(number-1)}">{arrow_back}{escape(copy["previous"])}</a>' if number>1 else '<span class="pager-step" aria-hidden="true"></span>']
                numbers=''
                for n in article_source.page_window(number,total_pages):
                    if n is None:numbers+='<li aria-hidden="true"><span class="pager-gap">…</span></li>'
                    elif n==number:numbers+=f'<li><span class="pager-page" aria-current="page">{n}</span></li>'
                    else:numbers+=f'<li><a class="pager-page" href="{page_href(n)}" aria-label="{escape(fill(copy["pageLink"],page=n),quote=True)}">{n}</a></li>'
                parts.append(f'<ol class="pager-pages">{numbers}</ol>')
                parts.append(f'<a class="pager-step" rel="next" href="{page_href(number+1)}">{escape(copy["next"])}{arrow_next}</a>' if number<total_pages else '<span class="pager-step" aria-hidden="true"></span>')
                return f'<nav class="pager" aria-label="{escape(copy["pagesLabel"],quote=True)}">{"".join(parts)}<p class="pager-status">{escape(fill(copy["pageOf"],page=number,pages=total_pages))}</p></nav>'
            topics=sorted({topic for item in articles for topic in item['langs'][lang].topics},key=str.casefold)
            index_url=route(lang,'articles')+'search-index.json'
            search_index=[]
            for item in articles:
                version=item['langs'][lang]
                image=item['images'][lang]
                small=(image['small'] or image) if image else None
                search_index.append({'url':route(lang,'articles/'+item['slug']),'title':version.title,'summary':version.summary,'topics':version.topics,
                    'date':article_source.format_date(version.date,copy['months']),'iso':version.date,'reading':article_source.reading_label(copy,lang,version.minutes),
                    'image':(base+'assets/articles/'+small['name']) if image else None,'width':small['width'] if image else None,'height':small['height'] if image else None})
            (out/('' if lang=='en' else lang)/'articles').mkdir(parents=True,exist_ok=True)
            (out/('' if lang=='en' else lang)/'articles/search-index.json').write_text(json.dumps(search_index,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
            js_copy={key:copy[key] for key in copy if key.startswith('results') or key=='noResults'}
            js_copy['lang']=lang
            chips=''.join(f'<button type="button" aria-pressed="false" data-topic="{escape(topic,quote=True)}">{escape(topic)}</button>' for topic in topics)
            tools=(f'<div class="articles-tools" hidden data-index="{index_url}"><form class="articles-search" role="search"><label class="sr-only" for="article-search">{escape(copy["searchLabel"])}</label>'
                   f'<input id="article-search" type="search" placeholder="{escape(copy["searchPlaceholder"],quote=True)}" autocomplete="off" enterkeyhint="search"><button class="articles-clear" type="button" hidden>{escape(copy["clear"])}</button></form>'
                   +(f'<div class="article-topics" role="group" aria-label="{escape(copy["topicsLabel"],quote=True)}">{chips}</div>' if topics else '')
                   +'<p class="articles-status" role="status" aria-live="polite"></p></div>')
            script='<script id="articles-copy" type="application/json">'+json.dumps(js_copy,ensure_ascii=False).replace('<','\\u003c')+f'</script><script defer src="{base}assets/articles.js"></script>'
            for number in range(1,total_pages+1):
                chunk=articles[(number-1)*size:number*size]
                list_label=escape(copy["listLabel"],quote=True)
                listing=f'<div class="articles-intro"><p class="eyebrow">{escape(copy["eyebrow"])}</p><h1>{escape(copy["heading"])}</h1><p class="articles-lede">{escape(copy["intro"])}</p></div>{tools}<ol class="article-list" aria-label="{list_label}">{"".join(row(item) for item in chunk)}</ol><ol class="article-list article-results" aria-label="{list_label}" hidden></ol>{pager(number)}{script}'
                title=copy['title'] if number==1 else fill(copy['pageTitle'],page=number,pages=total_pages)
                article_page('articles' if number==1 else f'articles/page/{number}',title,copy['description'],listing,noindex=all(item['draft'] for item in chunk))
            for item in articles:
                version=item['langs'][lang]
                section='articles/'+item['slug']
                url=origin+route(lang,section)
                back=f'<a class="text-link article-back" href="{route(lang,"articles")}">{chevron}{escape(copy["allArticles"])}</a>'
                draft=f'<p class="article-draft" data-article-draft>{escape(copy["draftNote"])}</p>' if item['draft'] else ''
                image=item['images'][lang]
                figure=(f'<figure class="article-figure"><img src="{base}assets/articles/{image["name"]}" alt="{escape(version.image_alt,quote=True)}" width="{image["width"]}" height="{image["height"]}" fetchpriority="high" decoding="async"></figure>' if image else '')
                main=(f'<article class="article"><nav class="article-nav" aria-label="{escape(copy["navLabel"],quote=True)}">{back}</nav>{draft}<header class="article-header"><p class="eyebrow">{escape(copy["eyebrow"])}</p><h1>{escape(version.title)}</h1><p class="article-summary">{escape(version.summary)}</p>{meta_line(version)}</header>'
                      f'{figure}<div class="article-body">{version.html}</div><div class="article-end">{back}</div></article>')
                schema={'@context':'https://schema.org','@type':'Article','headline':version.title,'description':version.summary,'inLanguage':lang,'datePublished':version.date,'dateModified':version.date,**({'image':[image_url(item)]} if image else {}),'mainEntityOfPage':url,'author':{'@type':'Organization','name':'SOUK-SCAN'},'publisher':{'@type':'Organization','name':'SOUK-SCAN','logo':{'@type':'ImageObject','url':origin+'/assets/brand/logo.png'}}}
                article_page(section,version.title+' — SOUK-SCAN',version.summary,main,schema,og_type='article',image=image_url(item),noindex=item['draft'])
    pages=[(lang,section,'2026-11-20' if section in ('privacy','terms','account-deletion') else '2026-11-15' if section in ('','support') else '2026-10-20') for lang in LANGUAGES for section in ('','privacy','terms','account-deletion','support')]
    live=[item for item in articles if not item['draft']]
    if live:pages+=[(lang,'articles' if n==1 else f'articles/page/{n}',live[(n-1)*args.articles_page_size]['date']) for lang in LANGUAGES for n in range(1,article_source.page_count(len(live),args.articles_page_size)+1)]+[(lang,'articles/'+item['slug'],item['date']) for lang in LANGUAGES for item in live]
    sitemap='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+escape(origin+route(lang,section))+'</loc><lastmod>'+lastmod+'</lastmod></url>' for lang,section,lastmod in pages)+'</urlset>'
    (out/'sitemap.xml').write_text(sitemap)
    (out/'robots.txt').write_text('User-agent: *\nDisallow: '+base+'\n' if args.preview else 'User-agent: *\nAllow: /\nSitemap: '+origin+base+'sitemap.xml\n')
    print(f'Built {len(pages)} localized pages in {out}, base {base}, preview={args.preview}')

if __name__=='__main__':main()
