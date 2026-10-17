/* Membership hook for members films (media/<slug>/ pages whose work has "access": "members").

   Today nobody is a member: isMember() always answers false, so the page keeps its quiet
   invitation. No payment or sign-in service has been chosen yet.

   ─── WHERE A MEMBERSHIP SERVICE PLUGS IN ──────────────────────────────────────────────
   When a provider is chosen (e.g. Memberstack, Outseta, or Stripe + Netlify Identity),
   replace the three functions in PROVIDER below, and nothing else on the site:

     isMember()      Promise<boolean>  true when the visitor is signed in with an active
                                       membership. Use the provider's own session so a
                                       member is never asked to sign in again.
     embedUrl(slug)  Promise<string>   a short-lived signed Bunny Stream embed address for
                                       that film, fetched from a server function that checks
                                       membership first, e.g.
                                         fetch('/api/media-embed?slug=' + slug, {credentials: 'same-origin'})
                                       The video ID lives only on the server (never in this page).
     signIn          string or null    address of the provider's sign-in page; when set, a
                                       small "Already a member? Sign in" appears under the
                                       invitation.

   Members then see the usual player (poster and play mark) in place of the invitation,
   immediately, and press play as on any public film (assets/media.js does the rest).
   See docs/video-essays.md, "Access". */
(function () {
  var PROVIDER = {
    isMember: function () { return Promise.resolve(false); },          // stub: no provider yet
    embedUrl: function (slug) { return Promise.reject(new Error('No membership provider yet')); },
    signIn: null
  };

  window.Membership = { isMember: function () { return PROVIDER.isMember(); } };

  var PLAY = '<span class="play" aria-hidden="true"><svg viewBox="0 0 14 16"><path d="M1.5 1.3l11 6.7-11 6.7z"/></svg></span>';

  function reveal(frame, src) {
    var title = frame.getAttribute('data-title') || 'Video';
    var button = document.createElement('button');
    button.className = 'facade';
    button.type = 'button';
    button.setAttribute('aria-label', 'Play ' + title + ' (' + (frame.getAttribute('data-duration') || '') + ')');
    var poster = frame.getAttribute('data-poster');
    if (poster) {
      var img = document.createElement('img');
      img.src = poster; img.alt = ''; img.decoding = 'async';
      button.appendChild(img);
    }
    button.insertAdjacentHTML('beforeend', PLAY);
    frame.setAttribute('data-embed', src);
    frame.classList.remove('invitation');
    frame.innerHTML = '';
    frame.appendChild(button);
  }

  var frames = document.querySelectorAll('.player-frame.invitation[data-work]');
  if (!frames.length) return;
  if (PROVIDER.signIn) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-member-signin]'), function (a) {
      a.href = PROVIDER.signIn;
      a.parentNode.hidden = false;
    });
  }
  PROVIDER.isMember().then(function (member) {
    if (!member) return;
    Array.prototype.forEach.call(frames, function (frame) {
      PROVIDER.embedUrl(frame.getAttribute('data-work')).then(function (src) {
        if (/^https:\/\/iframe\.mediadelivery\.net\//.test(src)) reveal(frame, src);
      }, function () { /* keep the invitation */ });
    });
  }, function () { /* keep the invitation */ });
})();
