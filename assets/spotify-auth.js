/* Spotify sign-in shared by every scored work and by the /spotify/ callback page.
 *
 * How it works (PKCE, no server needed):
 *   1. A story page calls SpotifyAuth.login(). We remember which page the reader
 *      was on, make a one-time PKCE verifier and a random "state" value, and send
 *      the reader to Spotify.
 *   2. Spotify sends the reader back to /spotify/ (the ONLY Redirect URI that needs
 *      to be registered in the Spotify developer dashboard).
 *   3. /spotify/ checks the state, trades the code for a token, saves it, and sends
 *      the reader back to the page they came from.
 *
 * Tokens live in sessionStorage: they survive the trip to Spotify and back in the
 * same tab, are shared by every page on this site, and are cleared when the tab closes.
 */
(function () {
  var CLIENT_ID = '2e37835d3aa448b18c48078687c0470d';
  // On kylelechner.io this is exactly https://kylelechner.io/spotify/
  var REDIRECT_URI = window.location.origin + '/spotify/';
  var SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state';
  var TOKEN_URL = 'https://accounts.spotify.com/api/token';

  var K = {
    token: 'spotify_token',
    expires: 'spotify_expires_at',
    refresh: 'spotify_refresh',
    verifier: 'pkce_verifier',
    state: 'spotify_auth_state',
    returnTo: 'spotify_return_to',
    error: 'spotify_auth_error'
  };
  var store = window.sessionStorage;

  function base64url(bytes) {
    return btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  function randomString() {
    var a = new Uint8Array(32);
    crypto.getRandomValues(a);
    return base64url(a);
  }
  async function codeChallenge(verifier) {
    var digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64url(new Uint8Array(digest));
  }

  // Only allow going back to a page on this same site (e.g. "/fiction/unbinding/").
  function safeReturnPath(path) {
    if (typeof path !== 'string' || path.charAt(0) !== '/' || path.charAt(1) === '/' || path.indexOf('\\') !== -1) return '/';
    try {
      var u = new URL(path, window.location.origin);
      if (u.origin !== window.location.origin) return '/';
      return u.pathname + u.search + u.hash;
    } catch (e) { return '/'; }
  }

  async function login(returnTo) {
    var verifier = randomString();
    var state = randomString();
    store.setItem(K.verifier, verifier);
    store.setItem(K.state, state);
    store.setItem(K.returnTo, safeReturnPath(returnTo || window.location.pathname));
    store.removeItem(K.error);
    var challenge = await codeChallenge(verifier);
    window.location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state: state
    }).toString();
  }

  // Save token + expiry + refresh token so later page loads know when it is stale
  function saveToken(data) {
    store.setItem(K.token, data.access_token);
    store.setItem(K.expires, String(Date.now() + (data.expires_in || 3600) * 1000));
    if (data.refresh_token) store.setItem(K.refresh, data.refresh_token);
  }
  function clearToken() {
    store.removeItem(K.token);
    store.removeItem(K.expires);
    store.removeItem(K.refresh);
  }
  function getStoredToken() { return store.getItem(K.token); }

  async function requestToken(params) {
    var res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    });
    if (!res.ok) throw new Error('Spotify token request failed (' + res.status + ')');
    var data = await res.json();
    if (!data.access_token) throw new Error('Spotify token missing');
    saveToken(data);
    return data.access_token;
  }

  async function refreshToken() {
    var refresh = store.getItem(K.refresh);
    if (!refresh) throw new Error('No refresh token');
    return requestToken({ client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: refresh });
  }

  // Valid token, refreshing if it expires within a minute; null if none usable
  async function getValidToken() {
    var token = store.getItem(K.token);
    var expiresAt = parseInt(store.getItem(K.expires) || '0', 10);
    if (token && Date.now() < expiresAt - 60000) return token;
    try { return await refreshToken(); } catch (e) { clearToken(); return null; }
  }

  // Used by /spotify/. Resolves to the path to send the reader back to.
  // Throws (with .returnTo set) if anything is wrong.
  async function handleCallback() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get('code');
    var state = params.get('state');
    var spotifyError = params.get('error');
    var expectedState = store.getItem(K.state);
    var verifier = store.getItem(K.verifier);
    var returnTo = safeReturnPath(store.getItem(K.returnTo) || '/');
    // Remove the one-time code from the address bar and history
    history.replaceState({}, '', window.location.pathname);
    store.removeItem(K.state);
    store.removeItem(K.verifier);
    store.removeItem(K.returnTo);
    try {
      if (spotifyError) throw new Error(spotifyError === 'access_denied' ? 'Spotify access was not allowed.' : 'Spotify returned an error: ' + spotifyError);
      if (!code) throw new Error('Spotify did not return a sign-in code.');
      if (!expectedState || state !== expectedState) throw new Error('This sign-in link has expired or did not start on this site.');
      if (!verifier) throw new Error('This sign-in has expired.');
      await requestToken({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
      });
      store.removeItem(K.error);
      return returnTo;
    } catch (err) {
      clearToken();
      store.setItem(K.error, '1');
      err.returnTo = returnTo;
      throw err;
    }
  }

  // True once if the last sign-in attempt failed (so the story can say so)
  function takeAuthError() {
    var had = store.getItem(K.error) === '1';
    store.removeItem(K.error);
    return had;
  }

  window.SpotifyAuth = {
    CLIENT_ID: CLIENT_ID,
    REDIRECT_URI: REDIRECT_URI,
    login: login,
    handleCallback: handleCallback,
    getValidToken: getValidToken,
    getStoredToken: getStoredToken,
    saveToken: saveToken,
    clearToken: clearToken,
    takeAuthError: takeAuthError,
    safeReturnPath: safeReturnPath
  };
})();
