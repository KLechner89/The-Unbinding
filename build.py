#!/usr/bin/env python3
"""
build.py — rebuilds index.html from chapter markdown files

Usage:
  python3 build.py

This reads each file in chapters/ and injects the prose
back into the HTML template, then writes index.html.
"""

import re, os

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

def md_to_html_paragraphs(md_text):
    """Convert markdown prose to HTML paragraphs."""
    # Strip the heading line
    lines = md_text.strip().split('\n')
    body_lines = [l for l in lines if not l.startswith('#')]
    body = '\n'.join(body_lines).strip()
    
    paragraphs = [p.strip() for p in re.split(r'\n\n+', body) if p.strip()]
    
    html_paras = []
    for i, p in enumerate(paragraphs):
        # Escape HTML entities
        p = p.replace('&', '&amp;').replace('"', '&ldquo;').replace('"', '&rdquo;')
        p = p.replace(''', '&lsquo;').replace(''', '&rsquo;').replace('—', '&mdash;')
        if i == 0:
            html_paras.append(f'<p class="first">{p}</p>')
        else:
            html_paras.append(f'<p>{p}</p>')
    
    return '\n        '.join(html_paras)

def build():
    with open('index.html', 'r') as f:
        html = f.read()
    
    # Find and replace each chapter's prose block
    for chapter in CHAPTERS:
        md_path = f'chapters/{chapter}.md'
        if not os.path.exists(md_path):
            print(f"WARNING: {md_path} not found, skipping")
            continue
        
        with open(md_path, 'r') as f:
            md_text = f.read()
        
        new_prose = md_to_html_paragraphs(md_text)
        
        # Match the prose div and replace its contents
        pattern = rf'(<div class="prose" data-chapter="{CHAPTERS.index(chapter)}"[^>]*>)(.*?)(</div>)'
        replacement = rf'\g<1>\n        {new_prose}\n      \g<3>'
        new_html = re.sub(pattern, replacement, html, flags=re.DOTALL)
        
        if new_html == html:
            print(f"WARNING: Chapter {chapter} — pattern not matched, prose unchanged")
        else:
            html = new_html
            print(f"Rebuilt: {chapter}")
    
    with open('index.html', 'w') as f:
        f.write(html)
    print("\nindex.html updated.")

if __name__ == '__main__':
    build()
