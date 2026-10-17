// Response form page (/respond/ = feedback.html): fills in which piece the reader came from
// (?piece=/path/&title=Title, see response_form.py) and sends without reloading the page,
// to Netlify Forms, the same way the form always has.
(function(){
  var form=document.querySelector('form.response-form'); if(!form) return;
  var box=form.closest('.response'), err=form.querySelector('.response-error'), btn=form.querySelector('button[type=submit]');
  var q=new URLSearchParams(location.search), title=q.get('title'), piece=q.get('piece');
  if(title && !form.elements.piece_title.value) form.elements.piece_title.value=title.trim().slice(0,200);
  if(piece && /^\/[A-Za-z0-9._~\/-]{0,199}$/.test(piece)) form.elements.piece.value=piece;
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    err.hidden=true; btn.disabled=true;
    try{
      var res=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(new FormData(form)).toString()});
      if(!res.ok) throw new Error(res.status);
      box.querySelector('.response-form-view').hidden=true;
      box.querySelector('.response-done').hidden=false;
    }catch(x){ err.hidden=false; btn.disabled=false; }
  });
})();
