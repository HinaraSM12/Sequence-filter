(function(){
  const openBtn  = document.getElementById('helpBtn');
  const modal    = document.getElementById('myModal');
  const dialog   = modal.querySelector('.modal-dialog');
  const closeBtn = modal.querySelector('.close');
  let backdrop   = null;

  function makeBackdrop(){
    const el = document.createElement('div');
    el.className = 'modal-backdrop fade';
    document.body.appendChild(el);
    // activar transición
    void el.offsetWidth;
    el.classList.add('show');
    return el;
  }

  function openModal(){
    if (!backdrop) backdrop = makeBackdrop();
    modal.style.display = 'block';
    modal.classList.add('show');
    modal.removeAttribute('aria-hidden');
    closeBtn.focus();
    document.addEventListener('keydown', onKey);
  }

  function closeModal(){
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    if (backdrop) backdrop.classList.remove('show');
    setTimeout(()=>{
      modal.style.display = 'none';
      if (backdrop){ backdrop.remove(); backdrop = null; }
      openBtn.focus();
    }, 200);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e){ if (e.key === 'Escape') closeModal(); }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('mousedown', (e)=>{ if (!dialog.contains(e.target)) closeModal(); });
})();
