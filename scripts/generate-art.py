"""Generate the original market illustrations. Run from any directory with Python 3.
Food illustrations reuse the app's Fluent Emoji assets; see app/assets/emojis/ATTRIBUTION.md.
"""
from pathlib import Path
import base64

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'

def food(name, x, y, size, rotate=0):
    data = base64.b64encode((ROOT / 'assets/products' / f'{name}.png').read_bytes()).decode()
    return f'<image href="data:image/png;base64,{data}" x="{x}" y="{y}" width="{size}" height="{size}" transform="rotate({rotate} {x+size/2} {y+size/2})"/>'

def crate(x,y,items):
    s=f'<g transform="translate({x} {y})"><path d="M0 13 5 0h64l6 13v37H0Z" fill="#8b704d"/><path d="M6 3h61v22H6Z" fill="#695a3e"/>'
    for i,item in enumerate(items):
        s+=food(item,3+i*18, -14 if i%2 else -8,35,i*12-15)
    s+='<path d="M0 18h75v12H0zm0 16h75v13H0Z" fill="#bfa071"/><path d="M2 17h7v33H2zm64 0h7v33h-7Z" fill="#d2b484"/><g fill="#826c4b"><circle cx="5" cy="22" r="1"/><circle cx="70" cy="22" r="1"/><circle cx="5" cy="42" r="1"/><circle cx="70" cy="42" r="1"/></g></g>'
    return s

configs=[('fruit','#527258','#e1e2bf','الفواكه',['orange','apple','banana'], '#e6d0aa', '#b88058'),('vegetable','#7b8559','#e6e0c2','الخضروات',['tomato','carrot','eggplant'],'#b6bf95','#986f4e'),('meat','#a86d58','#f0d9bf','الجزارة',['cut_of_meat','meat_on_bone'],'#e1d5c1','#b27a58'),('poultry','#bd985a','#f3e4bd','الدواجن',['chicken','egg','poultry_leg'],'#ddc99e','#9b6e4e')]
for idx,(name,color,light,arabic,items,shirt,skin) in enumerate(configs):
    s=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 294"><style>.vendor{{transform-origin:130px 191px;animation:sway 6s ease-in-out infinite;animation-delay:-{idx}s}}@keyframes sway{{50%{{transform:rotate(1.4deg)}}}}@media(prefers-reduced-motion:reduce){{.vendor{{animation:none}}}}</style><defs>
    <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#c2a57a"/><stop offset="1" stop-color="#a58a60"/></linearGradient>
    <linearGradient id="roof" x2="0" y2="1"><stop stop-color="{color}"/><stop offset="1" stop-color="{color}" stop-opacity=".88"/></linearGradient>
    <filter id="shadow" x="-20%" width="140%" y="-20%" height="160%"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <ellipse cx="132" cy="276" rx="115" ry="10" fill="#756e52" opacity=".14" filter="url(#shadow)"/>
    <path d="M25 85h210v171H25Z" fill="#c0ae89"/><path d="M35 90h190v139H35Z" fill="#877f5e"/>
    <path d="M44 98h172v132H44Z" fill="#6f7054"/><path d="M50 97v130m39-130v130m39-130v130m39-130v130m39-130v130" stroke="#a39a75" stroke-width="2" opacity=".25"/>
    <path d="M31 87v174m199-174v174" stroke="#886f4c" stroke-width="8"/><path d="M29 86v172m199-172v172" stroke="#b89e71" stroke-width="3"/>
    <path d="M15 64 35 22h190l20 42Z" fill="url(#roof)"/>'''
    for i in range(5):
        x=35+i*38
        s+=f'<path d="M{x} 22h19l{int((i-2)*2+3)} 42h-23Z" fill="{light}"/>'
    s+=f'<path d="M15 64h230v17q-12 16-23 0-12 16-23 0-12 16-23 0-12 16-23 0-12 16-23 0-12 16-23 0-12 16-23 0-12 16-23 0-12 16-23 0-12 16-23 0Z" fill="{color}"/><path d="M15 64h230" stroke="#f7f4ee" stroke-opacity=".25" stroke-width="2"/>'
    # Hand-lettered hanging shop sign, supported by two cords.
    s+=f'<path d="M89 85v15m82-15v15" stroke="#d1b78b" stroke-width="1.5"/><rect x="78" y="97" width="104" height="26" rx="2" fill="#efe6d0" stroke="#bda67d"/><text x="130" y="114" text-anchor="middle" font-family="serif" font-size="13" fill="#5e6047" direction="rtl">{arabic}</text>'
    # Vendor: apron, sleeves, expressive face and hands.
    s+='<g class="vendor">'
    s+=f'<path d="M101 181q-6-31 11-38l18-6 18 6q17 7 12 38Z" fill="{shirt}"/><path d="M116 145q14 8 28 0l7 51h-42Z" fill="{color}"/><path d="M119 146v40m22-40v40" stroke="#eee1bf" stroke-width="1.5"/><path d="M124 136v11q6 5 12 0v-11Z" fill="{skin}"/><ellipse cx="130" cy="130" rx="15" ry="18" fill="{skin}"/>'
    if idx==0:
        s+='<path d="M114 128v-8q16-10 32 0v8l-3-5h-27Z" fill="#ece3cb"/><path d="M116 119q14-11 28 0Z" fill="#e7ddc5"/>'
    elif idx==1:
        s+='<path d="M111 139q-3-36 18-35 23 0 20 35l-9 7v-23q-12 6-23-1l3 24Z" fill="#e3d6b4"/>'
    elif idx==2:
        s+='<path d="M115 123v-7q15-8 30 0v7Z" fill="#f0ebdd"/><path d="M118 137q12 16 24 0l-3 8h-18Z" fill="#59483b"/>'
    else:
        s+='<path d="M114 124v-8q15-13 32 0v8l-4-5h-24Z" fill="#615744"/>'
    s+='<g fill="#463e32"><circle cx="125" cy="129" r="1"/><circle cx="136" cy="129" r="1"/></g><path d="M127 137q4 3 7 0" fill="none" stroke="#7b5038" stroke-width="1"/>'
    s+=f'<path d="M109 156 98 184m52-28 12 28" stroke="{shirt}" stroke-width="10" stroke-linecap="round"/><path d="m98 184 14 5m50-5-13 5" stroke="{skin}" stroke-width="8" stroke-linecap="round"/>'
    s+='</g>'
    # Counter, slatted lower cabinet and a small weighing scale.
    s+='<path d="M22 195h216v67H22Z" fill="url(#wood)"/><path d="M18 189h224v10H18Z" fill="#d0b689"/><path d="M29 204h202m-202 16h202m-202 16h202m-202 16h202" stroke="#8e744e" stroke-width="1.3"/><path d="M35 200v60m191-60v60" stroke="#dbc096" stroke-width="5"/><path d="M20 261h15v13H20Zm205 0h15v13h-15Z" fill="#886e4a"/>'
    s+='<g transform="translate(179 152)"><path d="M0 34h37l-4-5H4Z" fill="#e5ddc7"/><path d="M17 0v28" stroke="#c3b99d" stroke-width="3"/><circle cx="18" cy="19" r="10" fill="#ece5d3" stroke="#b4aa8f"/><circle cx="18" cy="19" r="7" fill="#f6f0e3"/><path d="m18 19 4-4" stroke="#5e654e"/><path d="M0 0h36l-5 5H5Z" fill="#d5ceb7"/></g>'
    s+=crate(27,167,[items[i%len(items)] for i in range(3)])
    s+=crate(104,179,[items[(i+1)%len(items)] for i in range(3)])
    # Foreground stock, rug and chalkboard.
    s+=f'<path d="M51 267h151l9 12H42Z" fill="{color}" opacity=".23"/>'
    s+=crate(7,232,[items[(i+2)%len(items)] for i in range(3)])
    s+='<g transform="translate(185 222) rotate(6)"><path d="M2 9 0 53m34-44 6 44" stroke="#886d45" stroke-width="3"/><rect width="37" height="44" rx="2" fill="#b29565"/><rect x="3" y="3" width="31" height="37" fill="#47573f"/><path d="M10 12h17M9 27h19M12 32h13" stroke="#e7e2c9" stroke-width="1" opacity=".7"/><text x="18" y="23" font-size="7" text-anchor="middle" fill="#f3edda" font-family="serif">مرحبا</text></g>'
    if idx in (0,1):
        s+='<path d="M235 267h15l-2 15h-11Z" fill="#b4825d"/><path d="M243 268q-17-17-10-26 11 3 10 26m0-7q-1-23 8-25 7 13-8 25" fill="#737d50"/>'
    s+='</svg>'
    (ASSETS/f'stall-{name}.svg').write_text(s)

# Low-contrast original medina scene: earthy architecture, horseshoe arches and palms.
s='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1240 410"><defs>
<linearGradient id="sky" x2="0" y2="1"><stop stop-color="#eee9dc"/><stop offset="1" stop-color="#e9e4d2"/></linearGradient>
<linearGradient id="ground" x2="0" y2="1"><stop stop-color="#ded8bf"/><stop offset="1" stop-color="#eae5d6"/></linearGradient>
<pattern id="tile" width="38" height="22" patternUnits="userSpaceOnUse"><path d="M0 22 19 0l19 22M0 0h38" fill="none" stroke="#b6ae91" stroke-opacity=".16" stroke-width=".6"/></pattern>
</defs><path fill="url(#sky)" d="M0 0h1240v410H0Z"/>
<circle cx="221" cy="76" r="32" fill="#d8bd87" opacity=".56"/>
<path d="M0 164 100 150l72 9 49-24 81 25 78-18 54 13 70-11 99 18 88-21 81 21 74-12 61 15 91-17 88 21 75-16 79 18v160H0Z" fill="#dbd5bd"/>
<path d="M0 110h123v164H0Zm17-13h87v13H17Z" fill="#d4c9ac"/><path d="M24 137h29v51H24Zm49 0h29v51H73Z" fill="#beb599"/>
<path d="M103 142h98v132h-98Zm7-11h84v11h-84Z" fill="#dfd1b2"/><path d="M124 181v-14q11-24 22 0v14Zm37 0v-14q11-24 22 0v14Z" fill="#beb596"/>
<path d="M205 168h166v129H205Z" fill="#d7c4a4"/><path d="M217 158h142v10H217Z" fill="#c6b592"/><path d="M221 211v-25q12-25 24 0v25Zm43 0v-25q12-25 24 0v25Zm44 0v-25q12-25 24 0v25Z" fill="#b8ad8b"/>
<path d="M368 126h94v164h-94Z" fill="#dcd1b5"/><path d="M378 115h75v11h-75Z" fill="#c7bea2"/><path d="M390 163h18v27h-18Zm28 0h18v27h-18Z" fill="#b9b497"/>
<path d="M466 188h73v91h-73Z" fill="#d9caac"/>
<path d="M534 155h174v153H534Z" fill="#d8c9a9"/><path d="M547 144h148v11H547Z" fill="#c8b99a"/>
<path d="M572 308v-82c-25-44-3-77 49-91 52 14 74 47 49 91v82Z" fill="#c3b99a"/>
<path d="M584 308v-85c-20-36-1-61 37-74 38 13 57 38 37 74v85Z" fill="#b3ae8f"/>
<path d="M602 308v-80c-15-27-3-45 19-55 22 10 34 28 19 55v80Z" fill="#a4a388"/>
<path d="M541 178h26m109 0h25M541 199h21m119 0h20" stroke="#bcac8c" stroke-width="2"/>
<path d="M708 170h138v130H708Z" fill="#d9ccb0"/><path d="M713 161h129v9H713Z" fill="#c3b696"/><path d="M725 202v-20q10-24 20 0v20Zm36 0v-20q10-24 20 0v20Zm36 0v-20q10-24 20 0v20Z" fill="#b5ae90"/>
<path d="M847 127h116v181H847Z" fill="#d4c7a7"/><path d="M856 116h98v11h-98Z" fill="#c0b496"/><path d="M872 154h18v33h-18Zm34 0h18v33h-18Z" fill="#aaa78c"/>
<path d="M925 107h44v15h-44V107Zm5-69h34v73h-34V38Zm-4-9h42v10h-42Z" fill="#c6b693"/><path d="M936 56v-9q11-13 22 0v9Z" fill="#a8a184"/><path d="M939 29V18h17v11Z" fill="#b5a785"/><path d="M947 18V5" stroke="#a29575" stroke-width="2"/><circle cx="947" cy="7" r="3" fill="#a29575"/>
<path d="M961 167h120v135H961Z" fill="#d9ceb3"/><path d="M975 150h94v17h-94Z" fill="#c8bea1"/><path d="M984 203v-20q10-24 20 0v20Zm39 0v-20q10-24 20 0v20Z" fill="#b7b395"/>
<path d="M1080 104h160v208h-160Z" fill="#d9c7a7"/><path d="M1090 93h150v11h-150Z" fill="#c8b693"/><path d="M1107 145v-15q11-21 22 0v15Zm47 0v-15q11-21 22 0v15Zm47 0v-15q11-21 22 0v15Z" fill="#bcae8d"/>
<path d="M0 279q310-15 620 0t620 0v131H0Z" fill="url(#ground)"/><path d="M0 292h1240v118H0Z" fill="url(#tile)"/>
<path d="M0 314q300-6 620 0t620 0M0 348h1240M0 390h1240" fill="none" stroke="#bcb499" stroke-opacity=".17"/>
<g fill="none" stroke="#a6a180" stroke-width="1.5"><path d="M47 289q-5-130 2-171M1181 293q-5-135 1-180"/></g>
<g fill="#a4aa85"><path d="M49 120q-48-41-66-10 39-10 66 10Zm0 0q-21-70-51-56 36 21 51 56Zm0 0q25-66 48-45-29 13-48 45Zm0 0q39-27 61-4-32-6-61 4Zm1133-5q-41-48-67-26 44 1 67 26Zm0 0q-4-65 24-67-15 36-24 67Zm0 0q38-54 66-33-33 9-66 33Zm0 0q48-15 66 12-39-14-66-12Z"/></g>
<g stroke="#aa9d7d" fill="none" stroke-width="1"><path d="M94 105q57 33 114 28M966 100q54 35 113 24"/></g>
<g fill="#b4a379"><path d="m116 116 5 14 7-9Zm30 10 5 14 7-10Zm28 6 5 14 7-12Zm813-22 5 14 7-9Zm30 11 5 14 7-10Zm29 5 5 14 7-12Z"/></g>
</svg>'''
(ASSETS/'medina.svg').write_text(s)
print('Generated medina and four vendor illustrations.')
