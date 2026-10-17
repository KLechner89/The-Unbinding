#!/usr/bin/env python3
"""Builds the Media section from media/works.json.

Run:  python3 build_media.py           (add --prune to delete pages of works no longer published)

For every work whose status is "published" it writes media/<slug>/index.html, using the
layout in media/_template/index.html. It also rewrites the list of works on media/index.html
(only the part between the <!-- media-entries --> markers). With no published works,
the Media page shows a single muted "Forthcoming", exactly as before.
Works marked "forthcoming" are ignored: nothing about them appears on the site.
See README.md, "Adding a video essay", and docs/video-essays.md. Standard library only.
"""
import datetime, html, json, os, re, shutil, sys

from response_form import response_form

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = 'https://kylelechner.io'
WORKS = os.path.join(ROOT, 'media', 'works.json')
TEMPLATE = os.path.join(ROOT, 'media', '_template', 'index.html')
CATALOG = os.path.join(ROOT, 'media', 'index.html')
FOOTNOTES_JS = os.path.join(ROOT, 'assets', 'footnotes.js')
EMBED = 'https://iframe.mediadelivery.net/embed/{library}/{video}?autoplay=false&loop=false&muted=false&preload=true&responsive=true'
START = re.compile(r'^[ \t]*<!-- media-entries\b[^\n]*-->\n', re.M)
END = re.compile(r'^[ \t]*<!-- /media-entries -->\n', re.M)
PLAY_SVG = '<svg viewBox="0 0 14 16" aria-hidden="true"><path d="M1.5 1.3l11 6.7-11 6.7z"/></svg>'
FORTHCOMING = '''    <li class="work forthcoming">
      <div>
        <span class="n label" aria-hidden="true">&nbsp;</span>
        <h2>Forthcoming</h2>
      </div>
    </li>
'''
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']
REQUIRED = ['slug', 'title', 'date', 'description', 'form', 'duration', 'status']


class WorkError(Exception):
    pass


def esc(s):
    return html.escape(str(s), quote=True)


# ---------- reading works.json ----------

def load_works():
    try:
        data = json.load(open(WORKS, encoding='utf-8'))
    except json.JSONDecodeError as e:
        raise WorkError(f'media/works.json is not valid JSON (line {e.lineno}, column {e.colno}): {e.msg}')
    works = data.get('works') if isinstance(data, dict) else data
    if not isinstance(works, list):
        raise WorkError('media/works.json must be a list of works, or {"works": [...]}')
    seen = set()
    for i, w in enumerate(works, 1):
        where = f'work #{i} ({w.get("slug") or w.get("title") or "untitled"})' if isinstance(w, dict) else f'work #{i}'
        if not isinstance(w, dict):
            raise WorkError(f'{where}: each work must be an object {{...}}')
        missing = [k for k in REQUIRED if not str(w.get(k, '')).strip()]
        if missing:
            raise WorkError(f'{where}: missing {", ".join(missing)}')
        if w['status'] not in ('published', 'forthcoming'):
            raise WorkError(f'{where}: status must be "published" or "forthcoming", not "{w["status"]}"')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', w['slug']) or w['slug'] in ('_template', 'index'):
            raise WorkError(f'{where}: slug must be lowercase letters, numbers and hyphens, e.g. "on-the-said-and-the-shown"')
        if w['slug'] in seen:
            raise WorkError(f'{where}: slug "{w["slug"]}" is used twice')
        seen.add(w['slug'])
        try:
            w['_date'] = datetime.date.fromisoformat(w['date'])
        except ValueError:
            raise WorkError(f'{where}: date must be written YYYY-MM-DD, e.g. "2026-10-12"')
        if w['status'] != 'published':
            continue
        lib, vid = str(w.get('bunny_library_id', '')).strip(), str(w.get('bunny_video_id', '')).strip()
        if not re.fullmatch(r'\d+', lib):
            raise WorkError(f'{where}: bunny_library_id must be the number shown in Bunny Stream (e.g. "123456")')
        if not re.fullmatch(r'[A-Za-z0-9-]+', vid):
            raise WorkError(f'{where}: bunny_video_id must be the video ID from Bunny Stream (letters, numbers, hyphens)')
        w['bunny_library_id'], w['bunny_video_id'] = lib, vid
        poster = (w.get('poster') or '').strip()
        if poster and not (poster.startswith('https://') or poster.startswith('/')):
            raise WorkError(f'{where}: poster must be an https:// address or a path on this site starting with "/"')
        w['poster'] = poster
        t = (w.get('transcript') or '').strip()
        if t:
            path = os.path.join(ROOT, t.lstrip('/'))
            if not os.path.isfile(path):
                raise WorkError(f'{where}: transcript file not found: {t}')
            w['_transcript_path'] = path
    return works


def published(works):
    pub = [w for w in works if w['status'] == 'published']
    pub.sort(key=lambda w: (w['_date'], w['title']), reverse=True)  # newest first
    return pub


# ---------- transcript markdown ----------

def inline(s, links=()):
    s = html.escape(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)
    def url(m):
        u = m.group(0).rstrip('.,;')
        tail = m.group(0)[len(u):]
        if u in links:
            return f'<a href="{u}" rel="noopener" target="_blank">{u}</a>{tail}'
        return m.group(0)
    return re.sub(r'https?://[^\s<]+', url, s)


def fnrefs(h, notes, where):
    def ref(m):
        n = m.group(1)
        if int(n) not in notes:
            raise WorkError(f'{where}: footnote [^{n}] is used but has no "[^{n}]: ..." line')
        return (f'<sup class="fnref"><a href="#fn-{n}" id="fnref-{n}" aria-describedby="fn-{n}" '
                f'aria-label="Note {n}">{n}</a></sup>')
    return re.sub(r'\[\^(\d+)\]', ref, h)


def transcript_html(path, where):
    """Paragraphs, *italics*, **bold**, > blockquotes, and [^n] footnotes, in the same markup as the essays."""
    raw = open(path, encoding='utf-8').read().replace('\r\n', '\n')
    raw = re.sub(r'\A---\n.*?\n---\n', '', raw, flags=re.S)        # optional top block, ignored
    notes, body = {}, []
    for line in raw.split('\n'):
        nm = re.match(r'\[\^(\d+)\]:\s*(.*?)(?:\s*<(https?://[^>]+)>)?\s*$', line)
        if nm:
            notes[int(nm.group(1))] = (nm.group(2), nm.group(3))
        elif not re.match(r'^##\s+Notes\s*$', line):
            body.append(line)
    links = {u for _, u in notes.values() if u}
    out = ['<section class="transcript col" aria-labelledby="transcript-h">',
           '<h2 class="label" id="transcript-h">Transcript</h2>', '<div class="prose">']
    for block in re.split(r'\n\s*\n', '\n'.join(body)):
        block = block.strip()
        if not block:
            continue
        lines = block.split('\n')
        if all(l.lstrip().startswith('>') for l in lines):
            inner = '\n'.join(re.sub(r'^\s*>\s?', '', l) for l in lines)
            paras = [p.strip() for p in re.split(r'\n\s*\n', inner) if p.strip()]
            out.append('<blockquote>' + ''.join(
                f'<p>{fnrefs(inline(" ".join(p.split())), notes, where)}</p>' for p in paras) + '</blockquote>')
        else:
            out.append(f'<p>{fnrefs(inline(" ".join(block.split())), notes, where)}</p>')
    out.append('</div>')
    if notes:
        out.append('<section class="notes" aria-labelledby="notes-h">\n<h2 class="label" id="notes-h">Notes</h2>\n<ol>')
        for n, (t, u) in sorted(notes.items()):
            src = (f' <a class="src" href="{u}" rel="noopener" target="_blank">Source<span aria-hidden="true">&nbsp;&#8599;</span>'
                   f'<span class="sr-only"> (opens in a new tab)</span></a>') if u else ''
            out.append(f'<li id="fn-{n}"><span class="fn-text">{inline(t, links)}</span>{src} '
                       f'<a class="back" href="#fnref-{n}" aria-label="Back to text for note {n}">&#8617;&#xFE0E;</a></li>')
        out.append('</ol>\n</section>')
    out.append('</section>')
    return '\n'.join(out), bool(notes)


# ---------- pages ----------

def long_date(d):
    return f'{MONTHS[d.month - 1]} {d.day}, {d.year}'


def caption(w):
    parts = [w['form'], w['duration'], f'{MONTHS[w["_date"].month - 1][:3]} {w["_date"].year}']
    return ' &middot; '.join(esc(p) for p in parts if str(p).strip())


def work_page(w, nxt, template):
    url = f'/media/{w["slug"]}/'
    embed = EMBED.format(library=w['bunny_library_id'], video=w['bunny_video_id'])
    poster = w['poster']
    og = poster if poster.startswith('https://') else (SITE + poster if poster else SITE + '/og-image.png')
    poster_img = f'<img src="{esc(poster)}" alt="" decoding="async" fetchpriority="high">' if poster else ''
    transcript, has_notes = ('', False)
    if w.get('_transcript_path'):
        transcript, has_notes = transcript_html(w['_transcript_path'], f'transcript for {w["slug"]}')
    # The footnote pop-ups are optional: only linked when the transcript has notes and the script exists.
    fn_script = '<script src="/assets/footnotes.js" defer></script>' if has_notes and os.path.isfile(FOOTNOTES_JS) else ''
    pager = ''
    if nxt:
        pager = ('<nav class="pager" aria-label="More media">\n<span></span>\n'
                 f'<a class="next" href="/media/{nxt["slug"]}/"><span class="label">Next &rarr;</span>'
                 f'<span class="t">{esc(nxt["title"])}</span></a>\n</nav>')
    fields = {
        'TITLE': esc(w['title']), 'DESCRIPTION': esc(w['description']), 'URL': url,
        'OG_IMAGE': esc(og), 'FORM': esc(w['form']), 'DATE_ISO': w['_date'].isoformat(),
        'DATE': long_date(w['_date']), 'DURATION': esc(w['duration']), 'EMBED_URL': esc(embed),
        'POSTER_IMG': poster_img, 'TRANSCRIPT': transcript, 'PAGER': pager, 'FOOTNOTES_SCRIPT': fn_script,
        # "How did this make you feel?" box (response_form.py), before the Next / All media links
        'RESPONSE': response_form(f'{w["title"]} ({url})', 'col'),
    }
    page = re.sub(r'^.*<!-- template-only -->\n', '', template, flags=re.M)
    page = re.sub(r'<!--(?:(?!-->).)*?template-only\s*-->\n', '', page, flags=re.S)
    page = re.sub(r'\{\{([A-Z_]+)\}\}', lambda m: fields[m.group(1)], page)
    page = re.sub(r'^[ \t]*\n', '', page, flags=re.M)    # drop lines left empty by optional parts
    return page


def entry(w, n):
    if w['poster']:
        frame = f'<span class="frame"><img src="{esc(w["poster"])}" alt="" loading="lazy" decoding="async"></span>'
    else:
        frame = f'<span class="frame">{PLAY_SVG}</span>'
    return (f'    <li class="work"><a href="/media/{w["slug"]}/">{frame}<span class="n label">{n:02d}</span>'
            f'<h2>{esc(w["title"])}</h2><p>{esc(w["description"])}</p>'
            f'<span class="cap label">{caption(w)}</span></a></li>\n')


def catalog(pub, current):
    s, e = START.search(current), END.search(current)
    if not s or not e or e.start() < s.end():
        raise WorkError('media/index.html: could not find the <!-- media-entries --> and <!-- /media-entries --> markers')
    entries = ''.join(entry(w, i) for i, w in enumerate(pub, 1)) if pub else FORTHCOMING
    return current[:s.end()] + entries + current[e.start():]


def write(path, text):
    old = open(path, encoding='utf-8').read() if os.path.exists(path) else None
    if old == text:
        print('unchanged', os.path.relpath(path, ROOT))
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print('wrote', os.path.relpath(path, ROOT))


def main(argv):
    prune = '--prune' in argv
    try:
        works = load_works()
        pub = published(works)
        template = open(TEMPLATE, encoding='utf-8').read()
        pages = {w['slug']: work_page(w, pub[i + 1] if i + 1 < len(pub) else None, template) for i, w in enumerate(pub)}
        cat = catalog(pub, open(CATALOG, encoding='utf-8').read())
    except WorkError as e:
        print('build_media.py: ' + str(e), file=sys.stderr)
        return 1
    for slug, text in pages.items():
        write(os.path.join(ROOT, 'media', slug, 'index.html'), text)
    write(CATALOG, cat)
    # Pages this script made earlier for works that are no longer published.
    media = os.path.join(ROOT, 'media')
    for name in sorted(os.listdir(media)):
        page = os.path.join(media, name, 'index.html')
        if name.startswith('_') or name in pages or not os.path.isfile(page):
            continue
        if '<meta name="generator" content="build_media.py">' in open(page, encoding='utf-8').read():
            if prune:
                shutil.rmtree(os.path.join(media, name))
                print('removed', os.path.relpath(page, ROOT))
            else:
                print(f'note: media/{name}/ is no longer published; run with --prune to delete it')
    print(f'{len(pub)} published, {len(works) - len(pub)} forthcoming')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
