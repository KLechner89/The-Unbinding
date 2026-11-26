#!/usr/bin/env python3
"""Builds the RSS feed at /feed.xml.

Run:  python3 build_feed.py
Also called at the end of build_essays.py and build_media.py, so a new essay
or a newly published video is added automatically. The finished file is
committed with the rest of the site, because the site is served as committed
files.

The feed lists every published piece, newest first: essays from essays-src/,
The Unbinding, and any video in media/works.json whose status is "published".
Forthcoming media is omitted.
"""
import datetime
import glob
import html
import json
import os
import re
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = 'https://kylelechner.io'
FEED_PATH = os.path.join(ROOT, 'feed.xml')
ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

# First line of the About page. Used as the feed's channel description.
DESCRIPTION = (
    'This is a collection of thoughts, observations, and attempts to make '
    'sense of the world in which I find myself.'
)

# Published fiction. The Unbinding has no essay-style top block; the date is
# the day it first appeared in this repository (March 10, 2026). The
# description is the sentence on the Fiction catalog page.
FICTION = [
    dict(
        title='The Unbinding',
        url='/fiction/unbinding/',
        date='March 10, 2026',
        description='A story told in data and in the distance between people who have forgotten how to reach one another.',
    ),
]


def parse_date(s):
    s = s.strip()
    for fmt in ('%Y-%m-%d', '%B %d, %Y'):
        try:
            return datetime.datetime.strptime(s, fmt)
        except ValueError:
            continue
    raise ValueError(f'unrecognized date: {s}')


def rfc822(d):
    return f'{DAYS[d.weekday()]}, {d.day:02d} {MONTHS[d.month - 1]} {d.year} 00:00:00 +0000'


def read_frontmatter(path):
    raw = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---\n', raw, re.S)
    if not m:
        raise SystemExit(f'{path}: missing top block')
    meta = dict(l.split(': ', 1) for l in m.group(1).splitlines() if ': ' in l)
    meta['part'] = int(meta['part']) if 'part' in meta else None
    meta['file'] = path
    return meta


def item_title(e):
    if e.get('part') and e.get('series'):
        return f'{e["series"]} · Paper {ROMAN[e["part"]]}: {e["title"]}'
    return e['title']


def item_description(e):
    if e.get('subtitle'):
        return e['subtitle']
    if e.get('description'):
        return e['description']
    if e.get('part') and e.get('series'):
        return f'Paper {ROMAN[e["part"]]} of {e["series"]}.'
    return ''


def essays():
    items = []
    for path in sorted(glob.glob(os.path.join(ROOT, 'essays-src', '*.md'))):
        e = read_frontmatter(path)
        items.append(dict(
            title=item_title(e),
            url=e['url'],
            date=e['date'],
            description=item_description(e),
        ))
    return items


def media():
    path = os.path.join(ROOT, 'media', 'works.json')
    data = json.load(open(path, encoding='utf-8'))
    works = data.get('works') if isinstance(data, dict) else data
    items = []
    for w in works:
        if w.get('status') != 'published':
            continue
        items.append(dict(
            title=w['title'],
            url=f'/media/{w["slug"]}/',
            date=w['date'],
            description=w.get('description') or '',
        ))
    return items


def collect():
    items = essays() + list(FICTION) + media()
    for it in items:
        it['_date'] = parse_date(it['date'])
        if not it['url'].startswith('/'):
            raise SystemExit(f'url must be a site path starting with /: {it}')
    items.sort(key=lambda it: (it['_date'], it['url']), reverse=True)
    return items


def escape(s):
    return html.escape(s, quote=True)


def render(items):
    newest = items[0]['_date'] if items else datetime.datetime(2026, 1, 1)
    out = ['<?xml version="1.0" encoding="UTF-8"?>']
    out.append('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">')
    out.append('  <channel>')
    out.append(f'    <title>{escape("Kyle Lechner")}</title>')
    out.append(f'    <link>{escape(SITE)}</link>')
    out.append(f'    <description>{escape(DESCRIPTION)}</description>')
    out.append('    <language>en-us</language>')
    out.append(f'    <lastBuildDate>{rfc822(newest)}</lastBuildDate>')
    out.append(f'    <atom:link href="{escape(SITE + "/feed.xml")}" rel="self" type="application/rss+xml"/>')
    for it in items:
        url = SITE + it['url']
        out.append('    <item>')
        out.append(f'      <title>{escape(it["title"])}</title>')
        out.append(f'      <link>{escape(url)}</link>')
        out.append(f'      <guid isPermaLink="true">{escape(url)}</guid>')
        out.append(f'      <pubDate>{rfc822(it["_date"])}</pubDate>')
        if it['description']:
            out.append(f'      <description>{escape(it["description"])}</description>')
        out.append('    </item>')
    out.append('  </channel>')
    out.append('</rss>')
    out.append('')
    return '\n'.join(out)


def write_feed():
    items = collect()
    text = render(items)
    ET.fromstring(text)  # valid XML, or raise
    with open(FEED_PATH, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    print('wrote', os.path.relpath(FEED_PATH, ROOT), f'({len(items)} items)')
    return items


def main():
    write_feed()


if __name__ == '__main__':
    main()
