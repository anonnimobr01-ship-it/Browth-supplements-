// Visualização ampliada das fotos do produto, sem dependências externas.
export function enableProductZoom(main) {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const pointers = new Map();
  let overlay, stage, picture, caption, amount, slider, errorMessage;
  let scale = 1, offsetX = 0, offsetY = 0, pinch = null;
  let previousFocus = null, previousOverflow = '';

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'pz-overlay';
    overlay.hidden = true;
    overlay.innerHTML = [
      '<section class="pz-dialog" role="dialog" aria-modal="true" aria-labelledby="pz-title" aria-describedby="pz-help">',
      '<header class="pz-header"><div><span class="pz-eyebrow">BROWTH SUPPLEMENTS</span>',
      '<h2 id="pz-title">Detalhes da embalagem</h2><p class="pz-caption"></p></div>',
      '<button type="button" class="pz-close" data-pz="close" aria-label="Fechar imagem ampliada">✕</button></header>',
      '<div class="pz-stage" aria-label="Imagem ampliada, arraste para mover">',
      '<img alt="" draggable="false"><p class="pz-error" role="status" hidden>Não foi possível abrir esta imagem.</p></div>',
      '<footer class="pz-footer"><div class="pz-tools">',
      '<button type="button" data-pz="out" aria-label="Diminuir zoom">−</button>',
      '<input type="range" min="1" max="5" step="0.1" value="1" aria-label="Nível de zoom">',
      '<span class="pz-amount" aria-live="off">100%</span>',
      '<button type="button" data-pz="in" aria-label="Aumentar zoom">+</button>',
      '<button type="button" data-pz="reset" class="pz-reset">Restaurar</button>',
      '</div><p id="pz-help">Use a roda do mouse ou dois dedos para ampliar. Arraste para explorar.</p></footer>',
      '</section>'
    ].join('');
    document.body.append(overlay);
    stage = overlay.querySelector('.pz-stage');
    picture = stage.querySelector('img');
    caption = overlay.querySelector('.pz-caption');
    amount = overlay.querySelector('.pz-amount');
    slider = overlay.querySelector('input[type="range"]');
    errorMessage = overlay.querySelector('.pz-error');

    picture.addEventListener('error', () => {
      picture.hidden = true;
      errorMessage.hidden = false;
    });
    overlay.addEventListener('click', event => {
      const action = event.target.closest('[data-pz]')?.dataset.pz;
      if (action === 'close') close();
      else if (action === 'in') setZoom(scale + 0.5);
      else if (action === 'out') setZoom(scale - 0.5);
      else if (action === 'reset') setZoom(1);
      else if (event.target === overlay) close();
    });
    slider.addEventListener('input', () => setZoom(Number(slider.value)));
    stage.addEventListener('wheel', event => {
      event.preventDefault();
      setZoom(scale + (event.deltaY < 0 ? 0.25 : -0.25));
    }, { passive: false });
    stage.addEventListener('dblclick', event => {
      event.preventDefault();
      setZoom(scale > 1 ? 1 : 2.5);
    });

    stage.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      stage.setPointerCapture(event.pointerId);
      if (pointers.size === 2) {
        const points = [...pointers.values()];
        pinch = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale };
      }
    });
    stage.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      const previous = pointers.get(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2 && pinch) {
        const points = [...pointers.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        if (pinch.distance > 0) setZoom(pinch.scale * distance / pinch.distance);
      } else if (pointers.size === 1 && scale > 1) {
        offsetX += event.clientX - previous.x;
        offsetY += event.clientY - previous.y;
        draw();
      }
    });
    const stopPointer = event => {
      pointers.delete(event.pointerId);
      pinch = null;
    };
    stage.addEventListener('pointerup', stopPointer);
    stage.addEventListener('pointercancel', stopPointer);
    stage.addEventListener('lostpointercapture', stopPointer);
    window.addEventListener('resize', () => {
      if (!overlay.hidden) draw();
    });
  }

  function draw() {
    if (!picture || overlay.hidden) return;
    const limitX = Math.max(0, (picture.offsetWidth * scale - stage.clientWidth) / 2);
    const limitY = Math.max(0, (picture.offsetHeight * scale - stage.clientHeight) / 2);
    offsetX = clamp(offsetX, -limitX, limitX);
    offsetY = clamp(offsetY, -limitY, limitY);
    picture.style.transform = 'translate3d(' + offsetX + 'px,' + offsetY + 'px,0) scale(' + scale + ')';
    stage.classList.toggle('pz-pannable', scale > 1);
    amount.textContent = Math.round(scale * 100) + '%';
    slider.value = String(scale);
    overlay.querySelector('[data-pz="out"]').disabled = scale <= 1;
    overlay.querySelector('[data-pz="in"]').disabled = scale >= 5;
  }

  function setZoom(value) {
    scale = Math.round(clamp(value, 1, 5) * 100) / 100;
    if (scale === 1) { offsetX = 0; offsetY = 0; }
    draw();
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
    picture.src = selected.currentSrc || selected.src;
    picture.alt = selected.alt || 'Foto do produto';
    caption.textContent = picture.alt;
    scale = 1;
    offsetX = offsetY = 0;
    pointers.clear();
    pinch = null;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    draw();
    overlay.querySelector('[data-pz="close"]').focus();
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    picture.removeAttribute('src');
    picture.style.transform = '';
    document.body.style.overflow = previousOverflow;
    pointers.clear();
    pinch = null;
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
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(scale + 0.5); }
    else if (event.key === '-') { event.preventDefault(); setZoom(scale - 0.5); }
    else if (event.key === '0') { event.preventDefault(); setZoom(1); }
    else if (event.key === 'Tab') {
      const controls = [...overlay.querySelectorAll('button:not(:disabled),input:not(:disabled)')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('hashchange', close);
}
