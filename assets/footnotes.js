/* Footnote tooltips for essay pages.
   Each note marker (<sup class="fnref"><a href="#fn-N">) shows its note in a small panel:
   on hover (mouse), on keyboard focus, or on tap (touch). Escape or a tap elsewhere closes it; clicking a marker whose note is showing jumps to the Notes list.
   Without JavaScript the markers simply jump to the Notes list at the end of the page. */
(function () {
  var refs = document.querySelectorAll('.fnref a[href^="#fn-"]');
  if (!refs.length) return;
  var tip = document.createElement('span');
  tip.className = 'fn-tip';
  tip.id = 'fn-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  var current = null, hideTimer = null, quiet = false;

  function build(ref) {
    var id = ref.getAttribute('href').slice(1);
    var li = document.getElementById(id);
    if (!li) return false;
    tip.innerHTML = '';
    var num = document.createElement('span');
    num.className = 'num';
    num.textContent = id.replace('fn-', '');
    tip.appendChild(num);
    var text = li.querySelector('.fn-text');
    if (text) tip.appendChild(text.cloneNode(true));
    var src = li.querySelector('a.src');
    if (src) { tip.appendChild(document.createElement('br')); tip.appendChild(src.cloneNode(true)); }
    return true;
  }
  function place(ref) {
    var r = ref.getBoundingClientRect(), m = 12;
    tip.style.left = '0px'; tip.style.top = '0px';
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), vw - w - m);
    var top = r.bottom + 10;
    if (top + h > vh - m && r.top - h - 10 > m) top = r.top - h - 10;
    tip.style.left = Math.max(m, left) + 'px';
    tip.style.top = Math.max(m, top) + 'px';
  }
  function show(ref) {
    clearTimeout(hideTimer);
    if (current === ref && !tip.hidden) return;
    if (!build(ref)) return;
    if (current) current.setAttribute('aria-expanded', 'false');
    current = ref;
    ref.parentNode.parentNode.insertBefore(tip, ref.parentNode.nextSibling); // keeps the source link next in tab order
    tip.hidden = false;
    ref.setAttribute('aria-expanded', 'true');
    place(ref);
  }
  function hide() {
    clearTimeout(hideTimer);
    tip.hidden = true;
    if (current) current.setAttribute('aria-expanded', 'false');
    current = null;
  }
  function hideSoon() { clearTimeout(hideTimer); hideTimer = setTimeout(hide, 250); }

  var touched = false;
  refs.forEach(function (ref) {
    ref.setAttribute('aria-expanded', 'false');
    ref.addEventListener('touchstart', function () { touched = true; ref._wasOpen = current === ref && !tip.hidden; }, { passive: true });
    ref.addEventListener('mouseenter', function () { if (!touched) show(ref); });
    ref.addEventListener('mouseleave', function () { if (!touched) hideSoon(); });
    ref.addEventListener('focus', function () { if (!quiet) show(ref); });
    ref.addEventListener('blur', function (e) { if (!tip.contains(e.relatedTarget)) hideSoon(); });
    ref.addEventListener('click', function (e) {
      // If the note is already showing (hover, focus or an earlier tap), follow the link to the Notes list.
      var open = touched ? ref._wasOpen : (current === ref && !tip.hidden);
      ref._wasOpen = false;
      if (open) { hide(); return; }
      e.preventDefault();
      show(ref);
    });
  });
  tip.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
  tip.addEventListener('mouseleave', function () { if (!touched) hideSoon(); });
  tip.addEventListener('focusout', function (e) {
    if (!tip.contains(e.relatedTarget) && e.relatedTarget !== current) hideSoon();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !tip.hidden) {
      var back = current, inTip = tip.contains(document.activeElement);
      hide();
      if (back && inTip) { quiet = true; back.focus(); quiet = false; }
    }
  });
  document.addEventListener('click', function (e) {
    if (!tip.hidden && !tip.contains(e.target) && !(current && current.contains(e.target))) hide();
  });
  window.addEventListener('resize', function () { if (current && !tip.hidden) place(current); });
  window.addEventListener('scroll', function () { if (current && !tip.hidden) place(current); }, { passive: true });
})();
