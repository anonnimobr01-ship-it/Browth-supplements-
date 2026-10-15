// BROWTH: visualizador leve com zoom focado no cursor, pinça e arraste suave.
// Sem dependências; mantém a galeria de frente/verso e o restante do site intactos.
export function enableProductZoom(main) {
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const MAX_ZOOM = 6;
  const pointers = new Map();
  const current = { scale: 1, x: 0, y: 0 };
  const target = { scale: 1, x: 0, y: 0 };
  let overlay, stage, picture, caption, errorMessage;
  let frame = 0, previousFocus = null, previousOverflow = '';
  let lastTap = null, moved = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function limit(view) {
    if (!stage || !picture) return;
    const maxX = Math.max(0, (picture.clientWidth * view.scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (picture.clientHeight * view.scale - stage.clientHeight) / 2);
    view.x = clamp(view.x, -maxX, maxX);
    view.y = clamp(view.y, -maxY, maxY);
  }

  function tick() {
    frame = 0;
    if (!overlay || overlay.hidden) return;
    limit(target);
    const ease = reduceMotion.matches ? 1 : 0.32;
    current.scale += (target.scale - current.scale) * ease;
    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;
    const finished = Math.abs(target.scale - current.scale) < 0.002
      && Math.abs(target.x - current.x) < 0.3
      && Math.abs(target.y - current.y) < 0.3;
    if (finished) Object.assign(current, target);
    limit(current);
    picture.style.transform = 'translate3d(' + current.x + 'px,' + current.y + 'px,0) scale(' + current.scale + ')';
    stage.classList.toggle('pz-zoomed', target.scale > 1.02);
    if (!finished) frame = requestAnimationFrame(tick);
  }

  function redraw() {
    if (!frame && overlay && !overlay.hidden) frame = requestAnimationFrame(tick);
  }

  // Usa o cursor ou o centro entre os dedos como ponto fixo do zoom.
  function zoomAt(nextScale, clientX, clientY) {
    nextScale = clamp(nextScale, 1, MAX_ZOOM);
    const rect = stage.getBoundingClientRect();
    const fx = clientX - rect.left - rect.width / 2;
    const fy = clientY - rect.top - rect.height / 2;
    const factor = nextScale / target.scale;
    target.x = fx - (fx - target.x) * factor;
    target.y = fy - (fy - target.y) * factor;
    target.scale = nextScale;
    if (nextScale === 1) { target.x = 0; target.y = 0; }
    limit(target);
    redraw();
  }

  function zoomCenter(factor) {
    const rect = stage.getBoundingClientRect();
    zoomAt(target.scale * factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  function restore() {
    target.scale = 1;
    target.x = target.y = 0;
    redraw();
  }

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'pz-overlay';
    overlay.hidden = true;
    overlay.innerHTML = [
      '<section class="pz-dialog" role="dialog" aria-modal="true" aria-labelledby="pz-title" aria-describedby="pz-help">',
      '<div class="pz-stage" aria-label="Imagem ampliada">',
      '<img alt="" draggable="false"><p class="pz-error" role="status" hidden>Não foi possível carregar esta imagem.</p></div>',
      '<div class="pz-topbar"><div class="pz-heading"><span>BROWTH SUPPLEMENTS</span>',
      '<h2 id="pz-title">Visualização ampliada</h2><p class="pz-caption"></p></div>',
      '<button type="button" class="pz-close" data-pz="close" aria-label="Fechar imagem">✕</button></div>',
      '<button type="button" class="pz-restore" data-pz="restore">Restaure</button>',
      '<p class="pz-sr-only" id="pz-help">Use a roda do mouse ou dois dedos para dar zoom, arraste para mover e pressione Escape para fechar.</p>',
      '</section>'
    ].join('');
    document.body.append(overlay);
    stage = overlay.querySelector('.pz-stage');
    picture = stage.querySelector('img');
    caption = overlay.querySelector('.pz-caption');
    errorMessage = overlay.querySelector('.pz-error');

    picture.addEventListener('load', redraw);
    picture.addEventListener('error', () => {
      if (overlay.hidden) return;
      picture.hidden = true;
      errorMessage.hidden = false;
    });

    overlay.addEventListener('click', event => {
      const action = event.target.closest('[data-pz]')?.dataset.pz;
      if (action === 'close') close();
      else if (action === 'restore') restore();
      else if (event.target === overlay) close();
    });

    stage.addEventListener('wheel', event => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
      const factor = Math.exp(-clamp(delta, -150, 150) * 0.0028);
      zoomAt(target.scale * factor, event.clientX, event.clientY);
    }, { passive: false });

    stage.addEventListener('dblclick', event => {
      event.preventDefault();
      if (target.scale > 1.2) restore();
      else zoomAt(2.6, event.clientX, event.clientY);
    });

    stage.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY });
      moved = false;
      if (pointers.size > 1) lastTap = null;
      try { stage.setPointerCapture(event.pointerId); } catch { /* ponteiro já liberado */ }
    });

    stage.addEventListener('pointermove', event => {
      const prev = pointers.get(event.pointerId);
      if (!prev) return;
      if (Math.hypot(event.clientX - prev.startX, event.clientY - prev.startY) > 9) moved = true;
      if (pointers.size === 1) {
        if (target.scale > 1) {
          target.x += event.clientX - prev.x;
          target.y += event.clientY - prev.y;
          limit(target);
          redraw();
        }
        prev.x = event.clientX;
        prev.y = event.clientY;
      } else if (pointers.size === 2) {
        const other = [...pointers].find(([id]) => id !== event.pointerId)?.[1];
        if (!other) return;
        const oldDist = Math.hypot(prev.x - other.x, prev.y - other.y);
        const newDist = Math.hypot(event.clientX - other.x, event.clientY - other.y);
        const oldCenterX = (prev.x + other.x) / 2;
        const oldCenterY = (prev.y + other.y) / 2;
        const newCenterX = (event.clientX + other.x) / 2;
        const newCenterY = (event.clientY + other.y) / 2;
        if (oldDist > 0) zoomAt(target.scale * newDist / oldDist, oldCenterX, oldCenterY);
        target.x += newCenterX - oldCenterX;
        target.y += newCenterY - oldCenterY;
        limit(target);
        redraw();
        prev.x = event.clientX;
        prev.y = event.clientY;
      }
    });

    function endPointer(event) {
      if (!pointers.has(event.pointerId)) return;
      const wasSingle = pointers.size === 1;
      pointers.delete(event.pointerId);
      if (event.type === 'pointerup' && wasSingle && event.pointerType === 'touch' && !moved) {
        const now = performance.now();
        if (lastTap && now - lastTap.time < 320
          && Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 35) {
          if (target.scale > 1.2) restore();
          else zoomAt(2.6, event.clientX, event.clientY);
          lastTap = null;
        } else lastTap = { x: event.clientX, y: event.clientY, time: now };
      } else lastTap = null;
      if (pointers.size) moved = true;
    }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('lostpointercapture', endPointer);
    window.addEventListener('resize', () => { limit(target); redraw(); });
  }

  function open(gallery) {
    if (!gallery) return;
    const images = gallery.querySelectorAll('.gallery-track img');
    const index = Number(gallery.dataset.index || 0);
    const selected = images[index] || images[0];
    if (!selected) return;
    createOverlay();
    previousFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    picture.hidden = false;
    errorMessage.hidden = true;
    Object.assign(current, { scale: 1, x: 0, y: 0 });
    Object.assign(target, current);
    picture.style.transform = '';
    pointers.clear();
    lastTap = null;
    picture.alt = selected.alt || 'Foto do produto';
    caption.textContent = picture.alt;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    picture.src = selected.currentSrc || selected.src;
    redraw();
    overlay.querySelector('[data-pz="close"]').focus();
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    picture.removeAttribute('src');
    document.body.style.overflow = previousOverflow;
    pointers.clear();
    lastTap = null;
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }

  main.addEventListener('dblclick', event => {
    const gallery = event.target.closest('.product-gallery');
    if (!gallery || event.target.closest('button')) return;
    event.preventDefault();
    open(gallery);
  });
  main.addEventListener('click', event => {
    const button = event.target.closest('[data-zoom-open]');
    if (button) { event.preventDefault(); open(button.closest('.product-gallery')); }
  });
  document.addEventListener('keydown', event => {
    if (!overlay || overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomCenter(1.35); }
    else if (event.key === '-') { event.preventDefault(); zoomCenter(1 / 1.35); }
    else if (event.key === '0') { event.preventDefault(); restore(); }
    else if (event.key === 'Tab') {
      const controls = [...overlay.querySelectorAll('button:not(:disabled)')];
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
    }
  });
  window.addEventListener('hashchange', close);
}
