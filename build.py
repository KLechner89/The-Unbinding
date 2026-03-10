#!/usr/bin/env python3
"""
build.py — rebuilds index.html from chapter markdown files

Usage:
  python3 build.py

Edit any file in chapters/ then run this script.
Netlify will redeploy automatically after you git push.
"""

import re
import os

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
    text = text.replace('&', '&amp;')
    text = text.replace('\u201c', '&ldquo;').replace('\u201d', '&rdquo;')
    text = text.replace('\u2018', '&lsquo;').replace('\u2019', '&rsquo;')
    text = text.replace('\u2014', '&mdash;')
    return text

def md_to_html(md_text):
    # Strip heading line
    lines = md_text.strip().split('\n')
    body_lines = [l for l in lines if not l.startswith('#')]
    body = '\n'.join(body_lines).strip()

    # Split into paragraphs
    paragraphs = [p.strip() for p in re.split(r'\n\n+', body) if p.strip()]

    html_paras = []
    for i, p in enumerate(paragraphs):
        p = escape_html(p)
        if i == 0:
            html_paras.append(f'<p class="first">{p}</p>')
        else:
            html_paras.append(f'<p>{p}</p>')

    return '\n'.join(html_paras)

def build():
    with open('index.html', 'r') as f:
        html = f.read()

    for i, chapter in enumerate(CHAPTERS):
        md_path = f'chapters/{chapter}.md'
        if not os.path.exists(md_path):
            print(f"WARNING: {md_path} not found, skipping")
            continue

        with open(md_path, 'r') as f:
            md_text = f.read()

        new_prose = md_to_html(md_text)

        # Match the prose div by data-chapter index and replace its contents
        pattern = rf'(<div class="prose" data-chapter="{i}">)(.*?)(</div>)'
        replacement = rf'\g<1>{new_prose}\g<3>'
        new_html = re.sub(pattern, replacement, html, flags=re.DOTALL)

        if new_html == html:
            print(f"WARNING: Chapter {i} ({chapter}) — pattern not matched, prose unchanged")
        else:
            html = new_html
            print(f"OK: {chapter}")

    with open('index.html', 'w') as f:
        f.write(html)
    print("\nindex.html updated. Run: git add . && git commit -m 'edit' && git push")

if __name__ == '__main__':
    build()