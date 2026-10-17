#!/usr/bin/env python3
"""
build.py — rebuilds fiction/unbinding/index.html (the story page) from chapter markdown files

Usage:
  python3 build.py

Edit any file in chapters/ then run this script.
Netlify will redeploy automatically after you git push.
"""

import re
import os
import sys
import tempfile

from response_form import response_form, START as RESPONSE_START, END as RESPONSE_END

# The story page lives at kylelechner.io/fiction/unbinding/
STORY_PAGE = 'fiction/unbinding/index.html'

# Paths are relative to the folder this script is in, so it can be run from anywhere.
ROOT = os.path.dirname(os.path.abspath(__file__))

def path(relative):
    return os.path.join(ROOT, relative)

def slot_opening(i):
    return f'<div class="prose" data-chapter="{i}">'

def stop(lines):
    print("ERROR: build stopped.", file=sys.stderr)
    for line in lines:
        print(f"  {line}", file=sys.stderr)
    print(f"Nothing was changed in {STORY_PAGE}.", file=sys.stderr)
    sys.exit(1)

def write_atomically(target, text):
    # Write to a temporary file next to the page, then swap it in, so the page
    # is never left half-written if something goes wrong mid-write.
    folder = os.path.dirname(target)
    mode = os.stat(target).st_mode & 0o777
    fd, tmp = tempfile.mkstemp(dir=folder, prefix='.build-', suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            f.write(text)
        os.chmod(tmp, mode)
        os.replace(tmp, target)
    except BaseException:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise

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
    # Every chapter must have its source file. If any is missing, stop before
    # touching the story page, so a chapter is never silently left stale.
    missing = [f'chapters/{c}.md' for c in CHAPTERS if not os.path.exists(path(f'chapters/{c}.md'))]
    if missing:
        stop(["These chapter files are missing:"] + [f"  {m}" for m in missing]
             + ["Restore the file(s), or update CHAPTERS in build.py, then run again."])

    with open(path(STORY_PAGE), 'r', encoding='utf-8') as f:
        html = f.read()

    # Every chapter must have exactly one place on the story page to go into.
    problems = []
    for i, chapter in enumerate(CHAPTERS):
        found = html.count(slot_opening(i))
        if found != 1:
            problems.append(f'{chapter}: expected one {slot_opening(i)} on the page, found {found}')
    if problems:
        stop(["The story page does not have exactly one place for these chapters:"] + [f"  {p}" for p in problems])

    for i, chapter in enumerate(CHAPTERS):
        with open(path(f'chapters/{chapter}.md'), 'r', encoding='utf-8') as f:
            md_text = f.read()

        new_prose = md_to_html(md_text)

        # Match the prose div by data-chapter index and replace its contents
        pattern = rf'({re.escape(slot_opening(i))})(.*?)(</div>)'
        new_html, count = re.subn(pattern, lambda m: m.group(1) + new_prose + m.group(3), html, flags=re.DOTALL)
        if count != 1:
            stop([f'{chapter}: could not find the end of its place on the page (found {count} matches).'])

        if new_html == html:
            print(f"OK (unchanged): {chapter}")
        else:
            html = new_html
            print(f"Updated: {chapter}")

    # The "How did this make you feel?" box at the end of the story (response_form.py).
    # It sits between two marker comments after the last chapter; refresh it from the shared markup.
    if html.count(RESPONSE_START) != 1 or html.count(RESPONSE_END) != 1:
        stop([f"The story page must have exactly one response form between these two lines:",
              f"  {RESPONSE_START}", f"  {RESPONSE_END}",
              "Put them back after the last chapter (see README, 'Response box')."])
    title = re.search(r'<title>(.*?)</title>', html, re.S).group(1).split(' — ')[0].strip()
    block = response_form(f'{title} (/{os.path.dirname(STORY_PAGE)}/)')
    new_html = re.sub(re.escape(RESPONSE_START) + r'.*?' + re.escape(RESPONSE_END), lambda m: block, html, flags=re.S)
    print("OK (unchanged): response form" if new_html == html else "Updated: response form")
    html = new_html

    write_atomically(path(STORY_PAGE), html)
    print(f"\n{STORY_PAGE} updated. Run: git add . && git commit -m 'edit' && git push")

if __name__ == '__main__':
    build()