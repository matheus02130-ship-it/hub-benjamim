/* ============================================================
   SCREENS.JS — Navegação entre telas (SPA vanilla)
   ============================================================ */

const Screens = (() => {

  const VALID_SCREENS = ['hub', 'form', 'confirm'];
  let current = null;
  const stack = [];

  /** Ativa uma tela */
  function navigateTo(id, { pushHistory = true, fromPopstate = false } = {}) {
    if (!VALID_SCREENS.includes(id)) return;
    if (id === current) return;

    const target = document.getElementById(`screen-${id}`);
    if (!target) return;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('is-active'));
    target.classList.add('is-active');
    target.setAttribute('tabindex', '-1');

    window.scrollTo(0, 0);

    if (pushHistory) {
      stack.push(id);
      if (!fromPopstate) {
        history.pushState({ screen: id }, '', `#${id}`);
      }
    }

    current = id;

    requestAnimationFrame(() => animateScreenIn(target));
  }

  /** Volta para a tela anterior */
  function back() {
    if (stack.length > 1) {
      // Usa history.back() para que o popstate cuide da transição
      history.back();
    } else {
      // Fallback: força hub
      navigateTo('hub', { pushHistory: false });
    }
  }

  /** Anima elementos [data-anim] na tela */
  function animateScreenIn(screen) {
    const elements = screen.querySelectorAll('[data-anim]');
    elements.forEach((el, i) => {
      el.style.animationDelay = `${i * 80}ms`;
      el.classList.remove('is-visible');
      // Force reflow para reiniciar a animação
      void el.offsetWidth;
      el.classList.add('is-visible');
    });
  }

  /** Lê hash inicial (deeplink). Default = hub. */
  function readInitialScreen() {
    const hash = (location.hash || '').replace(/^#/, '');
    return VALID_SCREENS.includes(hash) ? hash : 'hub';
  }

  /** popstate — botão voltar do browser/sistema */
  function onPopState(e) {
    const target = e.state?.screen || readInitialScreen();
    if (stack.length > 1) stack.pop();
    navigateTo(target, { pushHistory: false });
  }

  /** Inicia */
  function init() {
    const initial = readInitialScreen();

    // Replace state inicial para que popstate sempre tenha referência
    history.replaceState({ screen: initial }, '', `#${initial}`);
    stack.push(initial);

    navigateTo(initial, { pushHistory: false });

    window.addEventListener('popstate', onPopState);
  }

  return { init, navigateTo, back, getCurrent: () => current };

})();
