//public/modal.js
(function(){
  const modal = document.getElementById('myModal');
  const btn = document.getElementById('helpBtn');
  const closeBtn = modal.querySelector('.close');

  function open(){ modal.classList.add('show','fade'); }
  function close(){ modal.classList.remove('show'); setTimeout(()=>modal.classList.remove('fade'),150); }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if(e.target === modal) close(); });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });
})();
