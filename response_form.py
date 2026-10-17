"""The small "How did this make you feel?" link at the end of every piece.

It takes the reader to the response form page, /respond/ (the same page as /feedback.html,
see _redirects), and tells it which piece they came from:
    /respond/?piece=/essays/mobius-censor/2/&title=The Möbius Censor · Paper II: ...
The form page fills in its "The piece" field from `title` (the reader can change it) and a
hidden `piece` field from `piece`. Responses go to the one Netlify form named "feedback".
Used by build_essays.py, build_media.py and build.py (The Unbinding). Styles: /assets/response.css.
"""
import html
from urllib.parse import urlencode, quote

START = '<!-- response link: written by build scripts from response_form.py; edit there -->'
END = '<!-- end response link -->'
CSS = '<link rel="stylesheet" href="/assets/response.css">'
FORM_PAGE = '/respond/'


def respond_link(title, path, extra_class=''):
    href = FORM_PAGE + '?' + urlencode({'piece': path, 'title': title}, quote_via=quote, safe='/')
    cls = f'respond {extra_class}'.strip()
    return (f'{START}\n<p class="{cls}"><a class="respond-link" href="{html.escape(href, quote=True)}">'
            f'How did this make you feel?</a></p>\n{END}')
