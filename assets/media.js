/* Video pages (media/<slug>/): lazy player.
   The page first shows only the poster and a small play mark. The Bunny Stream player
   (an iframe from iframe.mediadelivery.net) is loaded only when the viewer presses play,
   so nothing from the video host loads, and nothing plays, until then.
   Without JavaScript the <noscript> iframe inside .player-frame is used instead. */
(function () {
  var frames = document.querySelectorAll('.player-frame[data-embed]');
  Array.prototype.forEach.call(frames, function (frame) {
    var button = frame.querySelector('.facade');
    if (!button) return;
    button.addEventListener('click', function () {
      var src = frame.getAttribute('data-embed');
      // The press on the play mark is the viewer asking to play, so start playback
      // once the player loads instead of asking for a second press.
      src = src.replace('autoplay=false', 'autoplay=true');
      var iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = frame.getAttribute('data-title') || 'Video';
      iframe.setAttribute('allow', 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture');
      iframe.setAttribute('allowfullscreen', '');
      frame.classList.add('playing');
      frame.replaceChild(iframe, button);
      iframe.focus();
    });
  });
})();
