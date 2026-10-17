#!/usr/bin/env python3
"""Builds the essay pages from the text files in essays-src/.

Run:  python3 build_essays.py
Writes essays/<...>/index.html for every file in essays-src/, plus the
series landing page for each series (e.g. essays/mobius-censor/index.html).
See README.md, "Adding a new essay".
"""
import glob, html, os, re
from response_form import respond_link, CSS as RESPONSE_CSS

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = 'https://kylelechner.io'
ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

# One short description per series, shown on its landing page.
SERIES = {
    '/essays/mobius-censor/': dict(
        title='The Möbius Censor',
        description='What if the urge to make sense of things is itself a form of censorship? Traced through Nietzsche, Sade, Kosiński, and Bataille.',
        note='Written during Ada Palmer’s course on the history of censorship. Read in order. Then read again.'),
}

# Links that may be turned into live links when they appear as plain text in a note or bibliography.
def read(path):
    raw = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---\n', raw, re.S)
    meta = dict(l.split(': ', 1) for l in m.group(1).splitlines() if ': ' in l)
    rest = raw[m.end():]
    parts = re.split(r'^## (.+)$', rest, flags=re.M)
    body, sections = parts[0], {}
    for i in range(1, len(parts), 2):
        sections[parts[i].strip()] = parts[i + 1]
    meta['paras'] = [p.strip() for p in re.split(r'\n\s*\n', body) if p.strip()]
    notes = {}
    for line in sections.pop('Notes', '').splitlines():
        nm = re.match(r'\[\^(\d+)\]:\s*(.*?)(?:\s*<(https?://[^>]+)>)?\s*$', line)
        if nm: notes[int(nm.group(1))] = (nm.group(2), nm.group(3))
    meta['notes'] = notes
    meta['bib'] = []
    for name, txt in sections.items():
        meta['bib_heading'] = name
        meta['bib'] = [l.strip() for l in txt.splitlines() if l.strip()]
    meta['part'] = int(meta['part']) if 'part' in meta else None
    meta['file'] = path
    return meta

def inline(s, links=()):
    s = html.escape(s, quote=False)
    s = re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)
    def url(m):
        u = m.group(0).rstrip('.,;')
        tail = m.group(0)[len(u):]
        if u in links:
            return f'<a href="{u}" rel="noopener" target="_blank">{u}</a>{tail}'
        return m.group(0)
    return re.sub(r'https?://[^\s<]+', url, s)

def page_title(e):
    if e['part']: return f'Paper {ROMAN[e["part"]]}: {e["title"]} — Kyle Lechner'
    return f'{e["title"]} — Kyle Lechner'

def short_title(e):
    if e['part']: return f'{e["series"]} · Paper {ROMAN[e["part"]]}: {e["title"]}'
    return e['title']

def head(title, desc, url, extra_css=True, extra_head=''):
    t = html.escape(title); d = html.escape(desc)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{t}</title>
<meta name="description" content="{d}">
<link rel="canonical" href="{SITE}{url}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{SITE}{url}">
<meta property="og:image" content="{SITE}/assets/og-home.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}/assets/og-home.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400&family=EB+Garamond:ital,wght@0,400;1,400&family=JetBrains+Mono:wght@300;400&display=swap">
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/essay.css">{extra_head}
</head>
<body>
<div class="grain" aria-hidden="true"></div>
<header class="topbar">
  <a class="wordmark label" href="/">&larr; Kyle Lechner</a>
  <nav class="switcher" aria-label="Sections">
    <a class="label fiction" href="/fiction/">Fiction</a>
    <a class="label essays" href="/essays/" aria-current="page">Essays</a>
    <a class="label media" href="/media/">Media</a>
  </nav>
</header>
'''

def score_player(e):
    """Optional `score:` line in an essay's top block: the address of a song list such as
    /essays/carriage-and-platform/score.config.js (loop: true). Adds the same soundtrack
    player The Unbinding uses (bottom-right corner); the songs loop while the reader reads."""
    cfg = e.get('score', '').strip()
    if not cfg: return ''
    if not os.path.isfile(os.path.join(ROOT, cfg.strip('/'))):
        raise SystemExit(f'{e["file"]}: score: points to {cfg}, which does not exist')
    c = html.escape(cfg)
    return f'''<button id="spotifyLoginBtn" class="score-login" onclick="loginWithSpotify()">&#9654; CONNECT SPOTIFY</button>
<div class="audio-ctl" id="audioCtl"> <button id="audioToggle" aria-label="Play/Pause" aria-pressed="false">&#9654;</button> <span class="track-name" id="trackName">&mdash;</span> <input type="range" class="vol" id="volSlider" min="0" max="100" value="40" aria-label="Volume"> </div>
<!-- Soundtrack: this essay's songs are in {c}; the shared player is /assets/score.js -->
<script src="{c}"></script>
<script src="/assets/spotify-auth.js"></script>
<script src="/assets/score.js"></script>
'''

# The same connect / begin gates as fiction/unbinding/ (same buttons and wording), left-aligned
# under the essay's date. The essay text stays hidden until the reader picks one, as on The Unbinding.
SCORE_GATES = '''<!-- Landing gate -->
<div id="landingGate" style="margin-top:40px;display:flex;flex-direction:column;align-items:flex-start;gap:16px;">
  <button id="connectBtn" onclick="loginWithSpotify()" style="background:#1DB954;border:none;color:#000;font-family:'JetBrains Mono',monospace;font-size:0.65rem;letter-spacing:0.15em;padding:14px 32px;border-radius:2px;cursor:pointer;display:flex;align-items:center;gap:10px;-webkit-tap-highlight-color:transparent;">&#9654; CONNECT SPOTIFY TO BEGIN</button>
  <p style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;letter-spacing:0.1em;color:var(--text-muted);max-width:320px;">This piece is scored. Spotify Premium required for full audio experience.</p>
  <button onclick="readWithoutAudio()" style="background:none;border:none;color:var(--text-ghost);font-family:'JetBrains Mono',monospace;font-size:0.55rem;letter-spacing:0.1em;cursor:pointer;padding:4px 0;text-decoration:underline;text-underline-offset:3px;">read without audio</button>
</div>
<!-- Begin reading button — shown after auth -->
<div id="beginGate" style="margin-top:40px;display:none;flex-direction:column;align-items:flex-start;gap:16px;">
  <p style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;letter-spacing:0.1em;color:#1DB954;">&#10003; Spotify connected</p>
  <button onclick="beginReading()" style="background:transparent;border:1px solid var(--border);color:var(--text);font-family:'JetBrains Mono',monospace;font-size:0.65rem;letter-spacing:0.15em;padding:14px 32px;border-radius:2px;cursor:pointer;-webkit-tap-highlight-color:transparent;">BEGIN READING &darr;</button>
  <p style="font-family:'JetBrains Mono',monospace;font-size:0.55rem;letter-spacing:0.1em;color:var(--text-muted);max-width:320px;">Music will begin with the essay.</p>
</div>'''

def first_sentence(e):
    p = re.sub(r'\[\^\d+\]', '', e['paras'][0]).replace('*', '')
    m = re.match(r'(.+?[.?!])(\s|$)', p)
    return m.group(1) if m else p[:160]

def essay_page(e, by_url):
    links = {u for _, u in e['notes'].values() if u}
    extra = '\n' + RESPONSE_CSS
    if e.get('score'): extra += '\n<link rel="stylesheet" href="/assets/score.css">'
    out = [head(page_title(e), first_sentence(e), e['url'], extra_head=extra)]
    out.append('<main class="essay">\n<article>\n<header class="essay-head">')
    if e['part']:
        out.append(f'<p class="label kicker"><a href="{e["series_url"]}">{html.escape(e["series"])}</a> &middot; Paper {ROMAN[e["part"]]}</p>')
    else:
        out.append('<p class="label kicker"><a href="/essays/">Essay</a></p>')
    out.append(f'<h1>{inline(e["title"])}</h1>')
    if e.get('subtitle'): out.append(f'<p class="subtitle">{inline(e["subtitle"])}</p>')
    scored = bool(e.get('score'))
    out.append(f'<p class="label date"><time>{html.escape(e["date"])}</time></p>')
    if scored: out.append(SCORE_GATES)
    out.append('</header>')
    if scored: out.append('<div id="storyContent" style="display:none;">')
    out.append('<div class="prose" data-music="0">' if scored else '<div class="prose">')
    for p in e['paras']:
        h = inline(p)
        h = re.sub(r'\[\^(\d+)\]', lambda m: f'<sup class="fnref"><a href="#fn-{m.group(1)}" id="fnref-{m.group(1)}" aria-describedby="fn-{m.group(1)}" aria-label="Note {m.group(1)}">{m.group(1)}</a></sup>', h)
        out.append(f'<p>{h}</p>')
    out.append('</div>')
    if e['notes']:
        out.append('<section class="notes" aria-labelledby="notes-h">\n<h2 class="label" id="notes-h">Notes</h2>\n<ol>')
        for n, (t, u) in sorted(e['notes'].items()):
            src = f' <a class="src" href="{u}" rel="noopener" target="_blank">Source<span aria-hidden="true">&nbsp;&#8599;</span><span class="sr-only"> (opens in a new tab)</span></a>' if u else ''
            out.append(f'<li id="fn-{n}"><span class="fn-text">{inline(t, links)}</span>{src} <a class="back" href="#fnref-{n}" aria-label="Back to text for note {n}">&#8617;&#xFE0E;</a></li>')
        out.append('</ol>\n</section>')
    if e['bib']:
        out.append(f'<section class="bib" aria-labelledby="bib-h">\n<h2 class="label" id="bib-h">{html.escape(e["bib_heading"])}</h2>')
        for b in e['bib']: out.append(f'<p>{inline(b, links)}</p>')
        out.append('</section>')
    if scored: out.append('</div>')
    out.append('</article>')
    # "How did this make you feel?" link to the response form (response_form.py), before the Next / All essays links
    out.append(respond_link(short_title(e).replace('*', ''), e['url']))
    # previous (within the series) / next (series order, or the "next:" line)
    prev = nxt = None
    if e['part']:
        prev = by_url.get(f'{e["series_url"]}{e["part"] - 1}/')
        nxt = by_url.get(f'{e["series_url"]}{e["part"] + 1}/')
    if e.get('next'): nxt = by_url.get(e['next'])
    out.append('<nav class="pager" aria-label="More essays">')
    if prev: out.append(f'<a class="prev" href="{prev["url"]}"><span class="label">&larr; Previous</span><span class="t">{inline(short_title(prev))}</span></a>')
    else: out.append('<span></span>')
    if nxt: out.append(f'<a class="next" href="{nxt["url"]}"><span class="label">Next &rarr;</span><span class="t">{inline(short_title(nxt))}</span></a>')
    out.append('</nav>')
    out.append('<p class="back-links label">')
    if e['part']: out.append(f'<a href="{e["series_url"]}">All papers in {html.escape(e["series"])}</a> <span aria-hidden="true">&middot;</span> ')
    out.append('<a href="/essays/">All essays</a></p>')
    out.append('</main>\n<script src="/assets/footnotes.js" defer></script>')
    out.append(score_player(e) + '</body>\n</html>\n')
    return '\n'.join(out)

def series_page(url, papers):
    s = SERIES[url]
    out = [head(f'{s["title"]} — Kyle Lechner', s['description'], url)]
    out.append(f'<main class="catalog series" data-section="essays">\n<p class="label kicker"><a href="/essays/">Essays</a> &middot; Essay series</p>\n<h1>{html.escape(s["title"])}</h1>\n<p class="lede">{html.escape(s["description"])}</p>')
    if s.get('note'): out.append(f'<p class="lede note">{html.escape(s["note"])}</p>')
    out.append(f'<ol class="works" aria-label="Papers in {html.escape(s["title"])}">')
    for p in papers:
        out.append(f'<li class="work"><a href="{p["url"]}"><span class="n label">{ROMAN[p["part"]]}</span><h2>{inline(p["title"])}</h2><span class="cap label"><time>{html.escape(p["date"])}</time></span></a></li>')
    out.append('</ol>\n</main>\n</body>\n</html>\n')
    return '\n'.join(out)

def write(url, text):
    path = os.path.join(ROOT, url.strip('/'), 'index.html')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)
    print('wrote', os.path.relpath(path, ROOT))

def main():
    essays = [read(f) for f in sorted(glob.glob(os.path.join(ROOT, 'essays-src', '*.md')))]
    by_url = {e['url']: e for e in essays}
    for e in essays: write(e['url'], essay_page(e, by_url))
    for url in SERIES:
        papers = sorted((e for e in essays if e.get('series_url') == url), key=lambda e: e['part'])
        if papers: write(url, series_page(url, papers))

if __name__ == '__main__':
    main()
