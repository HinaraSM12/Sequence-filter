// Módulo mínimo para abrir/cerrar el modal de ayuda
(function(){
  const modal   = document.getElementById('myModal');
  const openBtn = document.getElementById('helpBtn');
  const closeBtn= modal?.querySelector('.close');

  if (!modal || !openBtn || !closeBtn) return;

  function open(){
    modal.setAttribute('aria-hidden','false');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  function close(){
    modal.setAttribute('aria-hidden','true');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') close(); });
})();
