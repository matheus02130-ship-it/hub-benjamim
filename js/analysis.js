/* ============================================================
   ANALYSIS.JS — Modal de análise de perfil Instagram (4 passos)
   ============================================================
   Fluxo:
     1) modal-input    → captura @handle
     2) modal-loading  → busca dados
     3) modal-confirm  → preview do perfil (avatar/nome/stats) + Confirmar
     4) modal-result   → diagnóstico em cartões de insight

   Contrato esperado do webhook ANALYSIS_WEBHOOK:

   POST  application/json
   {
     handle: "perfilhandle",
     lead:   { ...dados do formulário... },
     timestamp: "ISO-8601"
   }

   Resposta esperada (200):
   {
     handle:     "perfilhandle",
     fullName:   "Nome Completo",
     avatar:     "https://...jpg",
     bio:        "texto da bio",
     followers:  1234,
     following:  567,
     posts:      89,
     isVerified: false,
     isPrivate:  false,
     bioInsight:  "comentário sobre a bio",
     postInsight: "comentário sobre a presença",
     lastPost: {
       thumb:    "https://...jpg",
       likes:    48,
       comments: 8,
       caption:  "Texto do post"
     },
     copy: "frase de fechamento"
   }
   ============================================================ */

const Analysis = (() => {

  const ANALYSIS_WEBHOOK = 'https://estudiobenjamim.com.br/api/analyze';
  const REQUEST_TIMEOUT_MS = 20000;

  let handle = '';
  let analysisData = null;
  let abortController = null;

  // ---- Open / close ----
  function open() {
    const modal = document.getElementById('modal-analysis');
    if (!modal) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    showStep(1);
    setTimeout(() => document.getElementById('modal-handle-input')?.focus(), 200);
  }

  function close() {
    const modal = document.getElementById('modal-analysis');
    if (!modal) return;

    if (abortController) {
      abortController.abort();
      abortController = null;
    }

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    handle = '';
    analysisData = null;

    const input = document.getElementById('modal-handle-input');
    if (input) input.value = '';

    const btnAnalyze = document.getElementById('btn-analyze');
    if (btnAnalyze) {
      btnAnalyze.classList.remove('is-loading');
      btnAnalyze.disabled = false;
    }

    showStep(1);
    resetVisuals();
  }

  function resetVisuals() {
    // Confirmação
    const cAvatar = document.getElementById('confirm-avatar');
    if (cAvatar) {
      cAvatar.style.backgroundImage = '';
      cAvatar.classList.remove('has-image');
    }
    setText('confirm-fullname', '—');
    setText('confirm-handle', '@—');
    setText('confirm-posts', '—');
    setText('confirm-followers', '—');
    setText('confirm-following', '—');

    // Diagnóstico
    setText('insight-bio-copy', '');
    setText('insight-post-copy', '');
    setText('insight-post-likes', '—');
    setText('insight-post-comments', '—');
    setText('insight-post-caption', '');
    const thumb = document.getElementById('insight-post-thumb');
    if (thumb) thumb.style.backgroundImage = '';
  }

  // ---- Stepper + navegação ----
  // Mapeia passos numerados aos IDs das sub-telas.
  const STEPS = {
    1: 'modal-input',
    2: 'modal-loading',
    3: 'modal-confirm',
    4: 'modal-result',
  };

  function showStep(n) {
    const screenId = STEPS[n];
    if (!screenId) return;

    document.querySelectorAll('.modal-screen').forEach(s => s.classList.remove('is-active'));
    document.getElementById(screenId)?.classList.add('is-active');

    const stepper = document.getElementById('modal-stepper');
    if (stepper) stepper.setAttribute('data-step', String(n));
  }

  // ---- Validação ----
  function sanitizeHandle(raw) {
    return String(raw || '')
      .replace(/^@+/, '')
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
      .replace(/\/.*$/, '')
      .trim()
      .toLowerCase();
  }

  function isValidHandle(h) {
    return /^[a-z0-9._]{1,30}$/.test(h);
  }

  // ---- Análise ----
  async function startAnalysis() {
    const input = document.getElementById('modal-handle-input');
    handle = sanitizeHandle(input?.value);

    if (!handle) {
      Toast.show('⚠️', 'Digite o @ do seu perfil no Instagram');
      input?.focus();
      return;
    }
    if (!isValidHandle(handle)) {
      Toast.show('⚠️', 'Esse @ não parece válido. Confira e tente de novo.');
      input?.focus();
      return;
    }

    showStep(2);
    const loadingHandle = document.getElementById('modal-loading-handle');
    if (loadingHandle) loadingHandle.textContent = `@${handle}`;

    try {
      const data = await fetchAnalysis(handle);
      analysisData = data;
      sessionStorage.setItem('analysis', JSON.stringify(data));
      renderConfirm(data);
      showStep(3);
    } catch (err) {
      if (err.name === 'AbortError') return;
      const isNotFound = err.status === 404 || /not.?found|inex/i.test(err.message || '');
      Toast.show('⚠️', isNotFound
        ? 'Não encontramos esse perfil. Confira o @ e tente novamente.'
        : 'Não conseguimos analisar agora. Tente de novo em instantes.');
      showStep(1);
    }
  }

  async function fetchAnalysis(handle) {
    if (!ANALYSIS_WEBHOOK) {
      // Modo dev: dados simulados com latência variável
      await new Promise(r => setTimeout(r, 1800 + Math.random() * 1400));
      return generateMockData(handle);
    }

    abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController?.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(ANALYSIS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          lead: Form.getFormData(),
          timestamp: new Date().toISOString(),
        }),
        signal: abortController.signal,
      });
      if (!res.ok) {
        const e = new Error(`HTTP ${res.status}`);
        e.status = res.status;
        throw e;
      }
      return await res.json();
    } finally {
      clearTimeout(timeoutId);
      abortController = null;
    }
  }

  // ---- Render: passo 3 (confirmação) ----
  function renderConfirm(data) {
    const avatar = document.getElementById('confirm-avatar');
    const fallback = document.getElementById('confirm-avatar-fallback');
    if (avatar) {
      if (data.avatar) {
        const img = new Image();
        img.onload = () => {
          avatar.style.backgroundImage = `url("${data.avatar}")`;
          avatar.classList.add('has-image');
        };
        img.onerror = () => {
          avatar.classList.remove('has-image');
          if (fallback) fallback.textContent = (data.handle?.[0] || '@').toUpperCase();
        };
        img.src = data.avatar;
      } else {
        avatar.classList.remove('has-image');
        if (fallback) fallback.textContent = (data.handle?.[0] || '@').toUpperCase();
      }
    }

    setText('confirm-fullname', data.fullName || data.handle || '—');
    setText('confirm-handle',   `@${data.handle || ''}`);
    setText('confirm-posts',     formatNumber(data.posts));
    setText('confirm-followers', formatNumber(data.followers));
    setText('confirm-following', formatNumber(data.following));
  }

  // ---- Render: passo 4 (diagnóstico em cartões) ----
  function renderInsights(data) {
    setText('insight-bio-copy',  data.bioInsight  || generateBioInsight(data));
    setText('insight-post-copy', data.postInsight || generatePostInsight(data));

    const post = data.lastPost || {};
    setText('insight-post-likes',    formatNumber(post.likes ?? 0));
    setText('insight-post-comments', formatNumber(post.comments ?? 0));
    setText('insight-post-caption',  post.caption || 'Sem legenda no último post.');

    const thumb = document.getElementById('insight-post-thumb');
    if (thumb && post.thumb) thumb.style.backgroundImage = `url("${post.thumb}")`;

    setText('result-copy', data.copy || generateCopy(data));
  }

  // ---- Helpers ----
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? '';
  }

  function formatNumber(n) {
    if (n == null || isNaN(n)) return '—';
    n = Number(n);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0','')}M`;
    if (n >= 10_000)    return `${(n / 1_000).toFixed(0)}K`;
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace('.0','')}K`;
    return n.toLocaleString('pt-BR');
  }

  // ---- Geradores de copy (fallback quando webhook não traz) ----
  function generateBioInsight(data) {
    const bio = (data.bio || '').trim();
    if (!bio) return 'Sua bio está vazia — é o primeiro espaço de marca, e hoje ele não trabalha por você.';
    if (bio.length < 60) return 'Sua bio é direta, mas ainda não carrega o peso da marca. Pouca gente lê — quem lê precisa entender, em segundos, do que se trata.';
    return 'A bio comunica o que você faz, mas ainda fala mais como serviço do que como marca. Falta o ângulo que diferencia.';
  }

  function generatePostInsight(data) {
    const posts = Number(data.posts) || 0;
    if (posts < 20)  return 'Pouco volume publicado — o algoritmo ainda não tem repertório seu para distribuir. Frequência cria presença.';
    if (posts < 100) return 'Você posta com regularidade, mas sem repetição visual — falta um sistema que ancore a marca em cada peça.';
    return 'Volume alto, presença consistente. Agora o salto é em estratégia: cada post deveria carregar uma intenção clara.';
  }

  function generateCopy(data) {
    const followers = Number(data.followers) || 0;
    const posts     = Number(data.posts)     || 0;

    if (followers > 5000 && posts > 100) return 'Você já está no caminho. Vamos acelerar juntos.';
    if (followers > 1000)                return 'Existe uma audiência. Falta a estratégia que converte presença em negócio.';
    if (posts < 30)                      return 'Tem muito espaço pra crescer. O ponto de partida certo encurta o caminho.';
    return 'Seu negócio é excelente. Seu digital ainda não conta essa história.';
  }

  // ---- Mock para dev ----
  function generateMockData(handle) {
    const hash = Array.from(handle).reduce((a, c) => a + c.charCodeAt(0), 0);
    const seed = hash % 4;

    const cenarios = [
      // 0: negócio forte, digital fraco
      {
        fullName: 'Estúdio Vitalle',
        followers: 800,  following: 412, posts: 42,
        bio: 'Cuidando da sua saúde com excelência.',
        lastPost: { likes: 28, comments: 3, caption: 'Promoção de inverno: 20% off em todos os tratamentos.' },
      },
      // 1: começando do zero
      {
        fullName: 'Mariana Souza',
        followers: 240,  following: 980, posts: 12,
        bio: 'Empreendedora · São Paulo',
        lastPost: { likes: 14, comments: 1, caption: 'Bom dia pessoal!' },
      },
      // 2: já tem base, falta direção
      {
        fullName: 'Adinolfi Advocacia',
        followers: 4200, following: 312, posts: 134,
        bio: 'Direito empresarial e tributário · São Paulo',
        lastPost: { likes: 87, comments: 12, caption: 'Mudanças na reforma tributária — o que muda para sua empresa.' },
      },
      // 3: pronto pra escalar
      {
        fullName: 'Bárbara França',
        followers: 18500, following: 642, posts: 312,
        bio: 'Designer · Estúdio Benjamim · estrategia + identidade',
        lastPost: { likes: 412, comments: 38, caption: 'Posicionar é decidir o que NÃO se é. O resto é decoração.' },
      },
    ];

    const c = cenarios[seed];
    return {
      handle,
      fullName:  c.fullName,
      avatar:    null,         // em dev fica fallback com inicial
      bio:       c.bio,
      followers: c.followers,
      following: c.following,
      posts:     c.posts,
      lastPost:  c.lastPost,
      __mock:    true,
    };
  }

  // ---- Mensagem para WhatsApp (Contexto B — pós-análise) ----
  function buildResultMessage(data) {
    const lead = Form.getFormData();
    const partes = ['Olá! Acabei de fazer o diagnóstico do meu Instagram pelo site.'];
    if (lead.nome) partes.push(`Sou ${lead.nome}.`);
    partes.push(`Meu perfil é @${data.handle}.`);
    partes.push('Quero entender como vocês podem ajudar a virar essa chave.');
    return partes.join(' ');
  }

  // ---- Init ----
  function init() {
    document.querySelectorAll('[data-open-analysis]').forEach(btn => {
      btn.addEventListener('click', open);
    });

    document.getElementById('btn-modal-close')?.addEventListener('click', close);
    document.getElementById('btn-modal-close-result')?.addEventListener('click', close);
    document.getElementById('btn-analyze')?.addEventListener('click', startAnalysis);

    // Passo 3: confirmação
    document.getElementById('btn-back-to-input')?.addEventListener('click', () => {
      showStep(1);
      setTimeout(() => document.getElementById('modal-handle-input')?.focus(), 200);
    });

    document.getElementById('btn-search-other')?.addEventListener('click', () => {
      const input = document.getElementById('modal-handle-input');
      if (input) input.value = '';
      showStep(1);
      setTimeout(() => input?.focus(), 200);
    });

    document.getElementById('btn-confirm-profile')?.addEventListener('click', () => {
      if (!analysisData) return;
      renderInsights(analysisData);
      showStep(4);
    });

    // ESC fecha
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('modal-analysis');
      if (e.key === 'Escape' && modal?.classList.contains('is-open')) close();
    });

    // Click no backdrop (fora do sheet) fecha
    document.getElementById('modal-analysis')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) close();
    });

    document.getElementById('modal-handle-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); startAnalysis(); }
    });

    document.getElementById('btn-result-cta')?.addEventListener('click', () => {
      if (!analysisData) return;
      Form.openWhatsApp(buildResultMessage(analysisData));
    });
  }

  return { init, open, close };

})();
