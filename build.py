#!/usr/bin/env python3
"""
build.py — rebuilds index.html from chapter markdown files

Usage:
  python3 build.py

Edit any file in chapters/ then run this script.
Netlify will redeploy automatically after you git push.
"""

import re
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent

CHAPTERS = [
    "01-the-house-on-meridian-street",
    "02-margaret-at-the-window",
    "03-james-in-the-parking-lot",
    "04-what-claire-knew",
    "05-lily-does-not-answer",
    "06-what-they-were-taught",
    "07-the-apartment",
    "08-sunday-morning",
    "09-the-date",
    "10-the-floor-gives-way",
    "11-only-in-dreams",
]

def escape_html(text):
    text = escape(text, quote=False)
    text = text.replace('\u201c', '&ldquo;').replace('\u201d', '&rdquo;')
    text = text.replace('\u2018', '&lsquo;').replace('\u2019', '&rsquo;')
    text = text.replace('\u2014', '&mdash;')
    return text

def md_to_html(md_text):
    # Strip heading line
    lines = md_text.strip().split('\n')
    body_lines = lines[1:] if lines and lines[0].startswith('#') else lines
    body = '\n'.join(body_lines).strip()

    # Split into paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n\n+', body) if p.strip()]

    html_paras = []
    for i, p in enumerate(paragraphs):
        if p == '· · ·':
            html_paras.append('<p class="brk">· · ·</p>')
            continue
        p = escape_html(p)
        if i == 0 or (i > 0 and paragraphs[i-1] == '· · ·'):
            html_paras.append(f'<p class="first">{p}</p>')
        else:
            html_paras.append(f'<p>{p}</p>')

    return '\n'.join(html_paras)

def build():
    with (ROOT / 'index.html').open('r', encoding='utf-8') as f:
        html = f.read()

    for i, chapter in enumerate(CHAPTERS):
        md_path = ROOT / 'chapters' / f'{chapter}.md'
        if not md_path.is_file():
            raise ValueError(f'Missing chapter file: {md_path}')

        with md_path.open('r', encoding='utf-8') as f:
            md_text = f.read()

        new_prose = md_to_html(md_text)

        # Match the prose div by data-chapter index and replace its contents
        pattern = rf'(<div class="prose" data-chapter="{i}">)(.*?)(</div>)'
        new_html, count = re.subn(
            pattern, lambda match: match[1] + new_prose + match[3], html, flags=re.DOTALL
        )
        if count != 1:
            raise ValueError(f'Expected one prose container for {chapter}; found {count}')

        if new_html == html:
            print(f"OK (unchanged): {chapter}")
        else:
            html = new_html
            print(f"Updated: {chapter}")

    target = ROOT / 'index.html'
    temporary = target.with_suffix('.html.tmp')
    temporary.write_text(html, encoding='utf-8')
    temporary.replace(target)
    print("\nindex.html updated. Run: git add . && git commit -m 'edit' && git push")

if __name__ == '__main__':
    build()