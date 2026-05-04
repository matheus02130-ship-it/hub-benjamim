/* ============================================================
   ANIMATIONS.JS — Preloader e camada GSAP opcional
   A navegação entre telas e os fades de [data-anim] vivem em screens.js.
   Aqui ficam: dismiss do preloader e enriquecimento via GSAP, se disponível.
   ============================================================ */

const Animations = (() => {

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Preloader ----
  function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;

    const dismiss = () => {
      preloader.classList.add('is-hidden');
      // Espera o transition de opacity terminar e remove do DOM
      setTimeout(() => preloader.remove(), 700);
    };

    if (reducedMotion) {
      preloader.remove();
      return;
    }

    // Pequeno delay estético — garante que o nome do estúdio seja lido
    setTimeout(dismiss, 600);
  }

  // ---- GSAP — só ativa se carregou ----
  function initGSAP() {
    if (typeof gsap === 'undefined') return;
    if (reducedMotion) return;

    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    // Stagger sutil no hub. A animação base (CSS keyframe fadeUp) já roda;
    // o GSAP adiciona um movimento de saída mais elegante quando disponível.
    const hubName = document.querySelector('.hub__name');
    if (hubName) {
      gsap.from(hubName, {
        y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.3,
        clearProps: 'all',
      });
    }

    const hubClaim = document.querySelector('.hub__claim');
    if (hubClaim) {
      gsap.from(hubClaim, {
        y: 20, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.5,
        clearProps: 'all',
      });
    }

    const hubActions = document.querySelector('.hub__actions');
    if (hubActions) {
      gsap.from(hubActions, {
        y: 16, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.65,
        clearProps: 'all',
      });
    }
  }

  // ---- Init ----
  function init() {
    hidePreloader();
    initGSAP();
  }

  return { init };

})();
