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

    if (reducedMotion) {
      preloader.remove();
      return;
    }

    const percentEl = document.getElementById('preloader-percent');
    const duration  = 2200;   // ms total até dismiss
    let startTs     = null;

    // Fade-in via JS — evita conflito com CSS animation-fill-mode no Chrome.
    // Ambos os elementos começam em opacity:0 (CSS) e o JS faz a transição.
    const logoEl = document.querySelector('.preloader__logo-img');
    if (logoEl) {
      setTimeout(() => { logoEl.style.opacity = '1'; }, 80);
    }
    if (percentEl) {
      setTimeout(() => { percentEl.style.opacity = '1'; }, 200);
    }

    // Contador ease-out: rápido no início, desacelera perto de 100
    function tickPercent(ts) {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      // Curva: quadrática out (rápido → lento)
      const eased = 1 - Math.pow(1 - progress, 2.2);
      const value = Math.floor(eased * 100);

      if (percentEl) percentEl.textContent = value + '%';

      if (progress < 1) {
        requestAnimationFrame(tickPercent);
      }
    }

    requestAnimationFrame(tickPercent);

    // Dismiss: fecha em 100% e faz fade out
    setTimeout(() => {
      if (percentEl) percentEl.textContent = '100%';
      // Breve pausa para o 100% ser lido, depois fade out
      setTimeout(() => {
        preloader.classList.add('is-hidden');
        setTimeout(() => preloader.remove(), 600);
      }, 180);
    }, duration);
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
