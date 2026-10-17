"""The 'How did this make you feel?' box shown at the end of every piece.

One shared Netlify form, named "feedback" (the same form as /feedback.html), so every
response reaches Kyle the same way. The hidden "piece" field says which page it came from.
Used by build_essays.py, build_media.py and build.py (The Unbinding). Styles are in
/assets/response.css; the no-reload sending is /assets/response.js.
"""
import html

START = '<!-- response form: written by build scripts from response_form.py; edit there -->'
END = '<!-- end response form -->'
CSS = '<link rel="stylesheet" href="/assets/response.css">'
JS = '<script src="/assets/response.js" defer></script>'


def response_form(piece, extra_class=''):
    p = html.escape(piece, quote=True)
    cls = f'response {extra_class}'.strip()
    return f'''{START}
<section class="{cls}" aria-labelledby="response-h">
<div class="response-form-view">
<h2 class="response-h" id="response-h">How did this make you <span>feel?</span></h2>
<p class="response-sub">This is private. Your response goes only to the author. Nothing is displayed publicly.</p>
<form name="feedback" method="POST" data-netlify="true" netlify-honeypot="bot-field" class="response-form">
<input type="hidden" name="form-name" value="feedback">
<input type="hidden" name="piece" value="{p}">
<p class="response-hp"><label>Don&rsquo;t fill this out: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
<label class="response-label" for="response-message">Your response</label>
<textarea id="response-message" name="message" rows="4" placeholder="Whatever you want to say." required></textarea>
<div class="response-row">
<input type="text" name="name" placeholder="Name (optional)" aria-label="Name (optional)" autocomplete="name">
<input type="email" name="email" placeholder="Email (optional, if you&rsquo;d like a response)" aria-label="Email (optional, if you&rsquo;d like a response)" autocomplete="email">
</div>
<button type="submit">Send</button>
<p class="response-error" role="alert" hidden>Something went wrong. Please try again.</p>
</form>
</div>
<div class="response-done" role="status" hidden>
<p class="response-h">Received.</p>
<p class="response-sub">Thank you for reading.</p>
</div>
</section>
{END}'''
