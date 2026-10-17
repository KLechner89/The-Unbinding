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
})();
async function submitMailer(e){e.preventDefault();var f=e.target,d=new URLSearchParams(new FormData(f));try{var r=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:d.toString()});if(!r.ok)throw new Error(r.status);document.getElementById('mailerForm').style.display='none';document.getElementById('mailerSuccess').style.display='block';setTimeout(function(){closeMailer();setTimeout(function(){f.reset();document.getElementById('mailerForm').style.display='block';document.getElementById('mailerSuccess').style.display='none'},400)},1500)}catch(err){alert('That didn\u2019t go through. Check your connection and try again.')}}
