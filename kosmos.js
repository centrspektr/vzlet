/* Взлёт, 28.11.2026: касание слова "Взлёт" - рисуется заново. Только new.html. */
(function(){
  var w=document.querySelector('.kz-w');if(!w)return;
  var p=w.parentNode;p.style.cursor='pointer';p.setAttribute('title','Нажмите - слово нарисуется заново');
  var busy=false;
  p.addEventListener('click',function(){
    if(busy||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
    busy=true;w.classList.add('kz-re');
    void w.getBoundingClientRect();
    w.classList.remove('kz-re');
    setTimeout(function(){busy=false},2800);
  });
})();
