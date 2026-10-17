// Sends the "How did this make you feel?" box (response_form.py) without reloading the page.
// Posts to Netlify Forms the same way /feedback.html does.
(function(){
  document.querySelectorAll('form.response-form').forEach(function(form){
    var box=form.closest('.response'), err=form.querySelector('.response-error'), btn=form.querySelector('button[type=submit]');
    form.addEventListener('submit',async function(e){
      e.preventDefault();
      var piece=form.elements.piece;
      if(piece&&piece.value.indexOf(location.pathname)<0) piece.value=document.title+' ('+location.pathname+')';
      err.hidden=true; btn.disabled=true;
      try{
        var res=await fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(new FormData(form)).toString()});
        if(!res.ok) throw new Error(res.status);
        box.querySelector('.response-form-view').hidden=true;
        box.querySelector('.response-done').hidden=false;
      }catch(x){ err.hidden=false; btn.disabled=false; }
    });
  });
})();
