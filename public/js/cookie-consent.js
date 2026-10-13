// Consentimento de privacidade v1. Nenhum rastreador opcional é carregado pela loja.
(() => {
  'use strict';
  const KEY = 'browth-cookie-consent-v1';
  const isChoice = v => v === 'accepted' || v === 'rejected';
  function read() { try { const data = JSON.parse(localStorage.getItem(KEY) || 'null'); return data && isChoice(data.choice) ? data.choice : null; } catch { return null; } }
  function save(choice) {
    try { localStorage.setItem(KEY, JSON.stringify({ choice, saved_at: new Date().toISOString(), version: 1 })); }
    catch { /* A escolha também vale nesta página quando o armazenamento estiver indisponível. */ }
    window.browthCookieConsent = choice;
    window.dispatchEvent(new CustomEvent('browth:consent-change', { detail: { choice } }));
  }
  let panel;
  function close() { if (panel) { panel.remove(); panel = null; } }
  function choose(choice) { save(choice); close(); }
  function open() {
    if (panel) return;
    panel = document.createElement('section');
    panel.id = 'cookie-consent';
    panel.className = 'cookie-consent';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'cookie-consent-title');
    panel.setAttribute('aria-describedby', 'cookie-consent-desc');
    panel.innerHTML = `<div class="cookie-consent-content"><div><span class="cookie-consent-tag">PRIVACIDADE BROWTH</span><h2 id="cookie-consent-title">Você controla seus cookies.</h2><p id="cookie-consent-desc">Usamos armazenamento necessário para login, carrinho, pedidos e avaliações. Atualmente não utilizamos cookies opcionais de anúncios ou análise de navegação. Você pode aceitar ou recusar eventuais cookies opcionais; a loja continua funcionando ao recusar.</p><a href="/politicas.html#cookies">Saiba quais dados usamos</a></div><div class="cookie-consent-actions"><button type="button" id="cookie-decline" class="secondary">Recusar opcionais</button><button type="button" id="cookie-accept">Aceitar opcionais</button></div></div>`;
    document.body.appendChild(panel);
    panel.querySelector('#cookie-decline').addEventListener('click', () => choose('rejected'));
    panel.querySelector('#cookie-accept').addEventListener('click', () => choose('accepted'));
  }
  function init() {
    const choice = read();
    window.browthCookieConsent = choice;
    document.querySelectorAll('[data-cookie-settings]').forEach(btn => btn.addEventListener('click', open));
    if (!choice) open();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
