/* Three-dot menu and "Stay notified" mailing-list panel, same behavior as The Unbinding. */
(function(){
  var menu=document.getElementById('siteMenu'),btn=document.getElementById('menuBtn'),panel=document.getElementById('menuPanel'),overlay=document.getElementById('mailerOverlay');
  function setMenu(open){panel.classList.toggle('open',open);btn.setAttribute('aria-expanded',open);btn.setAttribute('aria-label',open?'Close menu':'Open menu');}
  window.openMailer=function(){setMenu(false);overlay.classList.add('open');menu.classList.add('behind');setTimeout(function(){var i=overlay.querySelector('input:not([type=hidden])');if(i)i.focus();},350);};
  window.closeMailer=function(){overlay.classList.remove('open');menu.classList.remove('behind');};
  window.toggleMailer=function(){overlay.classList.contains('open')?closeMailer():openMailer();};
  btn.addEventListener('click',function(){setMenu(!panel.classList.contains('open'));});
  document.addEventListener('click',function(e){
    if(menu.contains(e.target))return;
    if(panel.classList.contains('open'))setMenu(false);
    if(overlay.classList.contains('open')&&!overlay.contains(e.target))closeMailer();
  });
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    if(panel.classList.contains('open')){setMenu(false);btn.focus();}
    if(overlay.classList.contains('open')){closeMailer();btn.focus();}
  });

  /* RSS in the menu: a plain click copies https://kylelechner.io/feed.xml and
     shows "Feed link copied" for about two seconds. The href stays on the
     link so it still works without JavaScript and for right-click → copy link.
     If copying fails, the browser opens the feed instead. */
  var FEED_URL='https://kylelechner.io/feed.xml';
  var rss=menu.querySelector('a.menu-item[href="/feed.xml"], a.menu-item[href="https://kylelechner.io/feed.xml"]');
  function reduceMotion(){return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  function fallbackCopy(text){
    return new Promise(function(resolve,reject){
      var ta=document.createElement('textarea');
      ta.value=text;
      ta.setAttribute('readonly','');
      ta.setAttribute('aria-hidden','true');
      ta.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0,text.length);
      var ok=false;
      try{ok=document.execCommand('copy');}catch(err){ok=false;}
      document.body.removeChild(ta);
      if(ok)resolve();else reject(new Error('copy failed'));
    });
  }
  function copyFeedLink(){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(FEED_URL).catch(function(){return fallbackCopy(FEED_URL);});
    }
    return fallbackCopy(FEED_URL);
  }
  function showRssCopied(link){
    if(link._rssTimer){clearTimeout(link._rssTimer);link._rssTimer=null;}
    link.textContent='Feed link copied';
    link.classList.remove('rss-fade');
    link.classList.add('rss-copied');
    link.setAttribute('aria-live','polite');
    function restore(){
      link.textContent='RSS';
      link.classList.remove('rss-copied','rss-fade');
      link._rssTimer=null;
    }
    if(reduceMotion()){
      link._rssTimer=setTimeout(restore,2000);
      return;
    }
    link._rssTimer=setTimeout(function(){
      link.classList.add('rss-fade');
      link._rssTimer=setTimeout(restore,300);
    },2000);
  }
  if(rss){
    rss.addEventListener('click',function(e){
      if(e.defaultPrevented || e.button!==0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      copyFeedLink().then(function(){showRssCopied(rss);rss.focus();}, function(){window.location.href=rss.href;});
    });
  }
})();
async function submitMailer(e){e.preventDefault();var f=e.target,d=new URLSearchParams(new FormData(f));try{var r=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:d.toString()});if(!r.ok)throw new Error(r.status);document.getElementById('mailerForm').style.display='none';document.getElementById('mailerSuccess').style.display='block';setTimeout(function(){closeMailer();setTimeout(function(){f.reset();document.getElementById('mailerForm').style.display='block';document.getElementById('mailerSuccess').style.display='none'},400)},1500)}catch(err){alert('That didn\u2019t go through. Check your connection and try again.')}}
