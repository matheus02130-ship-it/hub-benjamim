/* ============================================================
   APP.JS — Ponto de entrada, Toast global, init dos módulos
   ============================================================ */

const Toast = (() => {
  let timer = null;

  function ensureNode() {
    let toast = document.getElementById('toast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <span class="toast__icon" id="toast-icon" aria-hidden="true"></span>
      <span class="toast__text" id="toast-text"></span>
    `;
    document.body.appendChild(toast);
    return toast;
  }

  function show(icon, message, duration = 3500) {
    const toast = ensureNode();
    document.getElementById('toast-icon').textContent = icon;
    document.getElementById('toast-text').textContent = message;
    toast.classList.add('is-visible');

    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('is-visible'), duration);
  }

  return { show };
})();


document.addEventListener('DOMContentLoaded', () => {
  Screens.init();
  Form.init();
  Analysis.init();
  Animations.init();

  document.getElementById('btn-proposta')?.addEventListener('click', () => {
    Screens.navigateTo('form');
  });
});

// ---- Fix BFCache (Instagram / Safari in-app browser) ----
// Quando o usuário fecha e reabre o link, o browser pode restaurar a página
// do cache sem disparar DOMContentLoaded novamente. O pageshow com
// event.persisted detecta esse caso e força um reload limpo.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});
