/* Shared soundtrack player for scored works (Spotify Web Playback SDK).
 *
 * This file has NO songs of its own. Each scored work supplies its own list in a
 * small config file loaded just before this one, for example:
 *
 *   <script src="score.config.js"></script>      (sets window.SCORE)
 *   <script src="/assets/spotify-auth.js"></script>
 *   <script src="/assets/score.js"></script>
 *
 *   window.SCORE = {
 *     playerName: 'Story title',
 *     tracks: [ { id: 'SpotifyTrackId', name: 'Artist — Song' }, ... ]
 *   };
 *
 * Song N plays when the reader scrolls to the element with data-music="N".
 * The page must contain these elements (copy them from fiction/unbinding/index.html):
 *   #spotifyLoginBtn, #audioCtl (with #audioToggle, #trackName, #volSlider),
 *   #landingGate, #beginGate, #storyContent.
 * Buttons on the page call loginWithSpotify(), readWithoutAudio() and beginReading().
 */
(function () {
  var config = window.SCORE;
  var Auth = window.SpotifyAuth;
  if (!Auth) { console.error('score.js: load /assets/spotify-auth.js first'); return; }
  if (!config || !Array.isArray(config.tracks) || !config.tracks.length) {
    console.error('score.js: window.SCORE.tracks is missing. Each scored work must list its own songs.');
    return;
  }
  var TRACK_IDS = config.tracks.map(function (t) { return t.id; });
  var SONG_NAMES = config.tracks.map(function (t) { return t.name || ''; });
  var PLAYER_NAME = config.playerName || document.title;

  var spotifyPlayer = null;
  var deviceId = null;
  var currentIdx = -1;
  var isPaused = false;
  var userVolume = 0.4;
  var fadeTimer = null;
  var audioUnlocked = false;
  var pendingCue = null;
  var sdkRequested = false;

  // === DOM REFS ===
  var audioToggle     = document.getElementById('audioToggle');
  var volSlider       = document.getElementById('volSlider');
  var trackName       = document.getElementById('trackName');
  var audioCtl        = document.getElementById('audioCtl');
  var spotifyLoginBtn = document.getElementById('spotifyLoginBtn');
  var storyContent    = document.getElementById('storyContent');
  var landingGate     = document.getElementById('landingGate');
  var beginGate       = document.getElementById('beginGate');

  var MSG_EXPIRED = '♫ Spotify session expired. Reconnect to enable audio';
  var MSG_FAILED  = '♫ Spotify connection failed. Try again or read without audio';
  var MSG_PREMIUM = '♫ Spotify Premium is required for audio. You can keep reading without it';
  var MSG_BROWSER = '♫ Audio is not supported in this browser. You can keep reading without it';
  var MSG_CONNECT = '♫ Connect Spotify to enable audio';

  function loginWithSpotify() { return Auth.login(window.location.pathname); }

  // Reset audio UI after an auth/account/SDK failure so the reader can reconnect
  function resetAudio(message) {
    audioUnlocked = false;
    deviceId = null;
    if (spotifyPlayer) { spotifyPlayer.disconnect(); spotifyPlayer = null; }
    beginGate.style.display = 'none';
    updatePlayerUI(false);
    audioCtl.classList.add('visible');
    trackName.textContent = message;
  }

  function showStory() {
    storyContent.style.display    = 'block';
    landingGate.style.display     = 'none';
    beginGate.style.display       = 'none';
    spotifyLoginBtn.style.display = 'none';
    document.body.classList.add('unlocked');
  }

  function scrollToFirstChapter() {
    setTimeout(function () {
      var ch1 = storyContent.querySelector('.ch-prose') || storyContent.querySelector('[data-music]');
      if (ch1) ch1.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }
  function readWithoutAudio() { showStory(); scrollToFirstChapter(); }
  function beginReading() { showStory(); scrollToFirstChapter(); }

  function showBeginButton() {
    landingGate.style.display     = 'none';
    beginGate.style.display       = 'flex';
    spotifyLoginBtn.style.display = 'none';
  }

  function updatePlayerUI(connected) {
    if (connected) {
      spotifyLoginBtn.style.display = 'none';
      audioCtl.classList.add('visible');
    } else {
      spotifyLoginBtn.style.display = 'flex';
    }
  }

  function initSpotify() {
    window.onSpotifyWebPlaybackSDKReady = function () {
      spotifyPlayer = new Spotify.Player({
        name: PLAYER_NAME,
        getOAuthToken: function (cb) { Auth.getValidToken().then(function (t) { cb(t || ''); }); },
        volume: userVolume
      });

      spotifyPlayer.addListener('ready', function (e) {
        deviceId = e.device_id;
        audioUnlocked = true;
        updatePlayerUI(true);
        showBeginButton();
        if (pendingCue !== null) {
          var cue = pendingCue;
          pendingCue = null;
          switchTo(cue);
        }
      });

      spotifyPlayer.addListener('not_ready', function () { deviceId = null; });

      spotifyPlayer.addListener('authentication_error', function (e) {
        console.error('Spotify authentication_error:', e.message);
        Auth.clearToken();
        resetAudio(MSG_EXPIRED);
      });
      spotifyPlayer.addListener('account_error', function (e) {
        console.error('Spotify account_error:', e.message);
        resetAudio(MSG_PREMIUM);
      });
      spotifyPlayer.addListener('initialization_error', function (e) {
        console.error('Spotify initialization_error:', e.message);
        resetAudio(MSG_BROWSER);
      });

      spotifyPlayer.addListener('player_state_changed', function (state) {
        if (!state) return;
        isPaused = state.paused;
        audioToggle.textContent = isPaused ? '▶' : '❚❚';
        audioToggle.setAttribute('aria-pressed', !isPaused);
      });

      spotifyPlayer.connect();
    };

    // Load Spotify SDK (once; if it is already loaded, start the player directly)
    if (window.Spotify && window.Spotify.Player) { window.onSpotifyWebPlaybackSDKReady(); return; }
    if (sdkRequested) return;
    sdkRequested = true;
    var script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    document.head.appendChild(script);
  }

  async function switchTo(toIdx) {
    if (!audioUnlocked || !deviceId) { pendingCue = toIdx; return; }
    if (toIdx === currentIdx && !isPaused) return;
    if (!TRACK_IDS[toIdx]) { console.warn('score.js: no song listed for data-music="' + toIdx + '"'); return; }
    if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }

    var fromIdx = currentIdx;
    currentIdx = toIdx;
    isPaused = false;

    trackName.textContent = SONG_NAMES[toIdx];
    audioToggle.textContent = '❚❚';

    // Start new track silent when crossfading, then ramp up
    if (fromIdx >= 0 && spotifyPlayer) await spotifyPlayer.setVolume(0);
    var token = (await Auth.getValidToken()) || Auth.getStoredToken();
    var res = await fetch('https://api.spotify.com/v1/me/player/play?device_id=' + deviceId, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: ['spotify:track:' + TRACK_IDS[toIdx]] })
    }).catch(function () { return null; });
    // Token expired — prompt re-auth
    if (res && res.status === 401) {
      Auth.clearToken();
      resetAudio(MSG_EXPIRED);
      return;
    }

    // Crossfade volume
    if (fromIdx >= 0) {
      var STEPS = 40;
      var interval = 2500 / STEPS;
      var step = 0;
      fadeTimer = setInterval(function () {
        step++;
        var p = step / STEPS;
        if (spotifyPlayer) spotifyPlayer.setVolume(userVolume * p);
        if (step >= STEPS) {
          clearInterval(fadeTimer);
          fadeTimer = null;
          if (spotifyPlayer) spotifyPlayer.setVolume(userVolume);
        }
      }, interval);
    } else {
      if (spotifyPlayer) await spotifyPlayer.setVolume(userVolume);
    }
  }

  audioToggle.addEventListener('click', async function () {
    if (!spotifyPlayer) return;
    await spotifyPlayer.togglePlay();
  });

  volSlider.addEventListener('input', async function (e) {
    userVolume = e.target.value / 100;
    if (spotifyPlayer) await spotifyPlayer.setVolume(userVolume);
  });

  // === Scroll-based track switching ===
  var musicCues = document.querySelectorAll('[data-music]');
  var scrollTimer = null;

  // Cache chapter positions — recalculate only when layout changes
  var chapterTops = null;
  function getChapterTops() {
    if (chapterTops) return chapterTops;
    chapterTops = Array.from(musicCues).map(function (el) {
      return { top: el.getBoundingClientRect().top + window.scrollY, idx: parseInt(el.dataset.music, 10) };
    });
    return chapterTops;
  }
  window.addEventListener('resize', function () { chapterTops = null; }, { passive: true });
  // Charts, fonts and reveals shift layout without a resize; re-measure on any size change
  if (window.ResizeObserver) new ResizeObserver(function () { chapterTops = null; }).observe(document.body);
  window.addEventListener('load', function () { chapterTops = null; });

  function getActiveChapterIdx() {
    var trigger = window.scrollY + window.innerHeight * 0.3;
    var tops = getChapterTops();
    var bestIdx = -1;
    var bestScore = Infinity;
    for (var i = 0; i < tops.length; i++) {
      if (tops[i].top > trigger) continue;
      var score = trigger - tops[i].top;
      if (score < bestScore) { bestScore = score; bestIdx = tops[i].idx; }
    }
    return bestIdx;
  }

  window.addEventListener('scroll', function () {
    // Chapter detection (debounced)
    if (scrollTimer) return;
    scrollTimer = setTimeout(function () {
      scrollTimer = null;
      var idx = getActiveChapterIdx();
      if (idx !== -1 && idx !== currentIdx) {
        if (audioUnlocked && deviceId) switchTo(idx);
        else pendingCue = idx;
      }
    }, 100);
  }, { passive: true });

  var musicObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      audioCtl.classList.add('visible');
      if (!audioUnlocked) trackName.textContent = MSG_CONNECT;
    });
  }, { threshold: 0.1 });
  musicCues.forEach(function (el) { musicObs.observe(el); });

  // === On page load ===
  // Back from /spotify/ (or a reload): restore the session if a token exists.
  function onLoad() {
    if (Auth.takeAuthError()) {
      showStory();
      resetAudio(MSG_FAILED);
      return;
    }
    if (Auth.getStoredToken()) {
      showStory();
      Auth.getValidToken().then(function (token) {
        if (token) initSpotify();
        else resetAudio(MSG_EXPIRED);
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onLoad); else onLoad();

  // Used by onclick="..." on the page
  window.loginWithSpotify = loginWithSpotify;
  window.readWithoutAudio = readWithoutAudio;
  window.beginReading = beginReading;
})();
