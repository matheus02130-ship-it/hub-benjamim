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
      // Completa a barra antes de sair
      const bar = preloader.querySelector('.preloader__bar');
      if (bar) {
        bar.style.transition = 'width 0.25s ease-out';
        bar.style.width = '100%';
      }
      // Pequena pausa para a barra chegar a 100%, depois fade out
      setTimeout(() => {
        preloader.classList.add('is-hidden');
        setTimeout(() => preloader.remove(), 700);
      }, 260);
    };

    if (reducedMotion) {
      preloader.remove();
      return;
    }

    // Delay generoso — garante que a barra avança e o nome é lido
    setTimeout(dismiss, 2200);
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
