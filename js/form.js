/* ============================================================
   FORM.JS — Formulário de captação de leads
   ============================================================ */

const Form = (() => {

  // ---- Config ----
  // Webhook que recebe o lead. Make/n8n/Supabase function. Formato esperado:
  // POST application/json { nome, whatsapp, segmento, melhorar[], investimento, observacao, source, timestamp }
  const WEBHOOK_URL = '';

  // WhatsApp do estúdio. DDI + DDD + número, só dígitos.
  // Placeholder: 5511999999999 (substituir antes do deploy).
  const WA_NUMBER = '5511925136263';   /* Bella — linha direta */

  // Rótulos legíveis para incluir nas mensagens (ao invés do slug)
  const SEGMENTO_LABEL = {
    'saude-estetica':         'Saúde e Estética',
    'gastronomia':            'Gastronomia',
    'moda-beleza':            'Moda e Beleza',
    'escritorio-consultoria': 'Escritório e Consultoria',
    'fitness-bem-estar':      'Fitness e Bem-estar',
    'educacao':               'Educação',
    'outro':                  'outro segmento',
  };

  const MELHORAR_LABEL = {
    'marca':              'a marca',
    'presenca-digital':   'a presença digital',
    'site':               'o site',
    'marketing':          'o marketing',
    'diagnostico':        'um diagnóstico geral',
  };

  // ---- Estado ----
  let formData = {};
  let isSubmitting = false;
  let hasSubmitted = false;   // só vira true após persistLead() bem-sucedido

  // ---- Checkboxes multi-select (divs com role="checkbox") ----
  function initCheckboxes() {
    document.querySelectorAll('.checkbox-item').forEach(item => {
      const toggle = () => {
        const checked = item.classList.toggle('is-checked');
        item.setAttribute('aria-checked', String(checked));
        notifyChange();
      };
      item.addEventListener('click', toggle);
      item.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          toggle();
        }
      });
    });
  }

  // ---- Coleta dados do form ----
  function collectData() {
    const nome         = document.getElementById('field-nome')?.value.trim() || '';
    const whatsappRaw  = document.getElementById('field-whatsapp')?.value.trim() || '';
    const segmento     = document.getElementById('field-segmento')?.value || '';
    const investimento = document.getElementById('field-investimento')?.value || '';
    const observacao   = document.getElementById('field-observacao')?.value.trim() || '';

    const melhorar = Array.from(
      document.querySelectorAll('#group-melhorar .checkbox-item.is-checked')
    ).map(item => item.dataset.value);

    return {
      nome,
      whatsapp: whatsappRaw,
      whatsappDigits: whatsappRaw.replace(/\D/g, ''),
      segmento,
      melhorar,
      investimento,
      observacao,
    };
  }

  // ---- Validação ----
  // WhatsApp BR: aceita 10 dígitos (fixo/sem nono) ou 11 dígitos (celular com nono).
  // Retorna mensagem de erro ou null se válido.
  function validate(data) {
    if (!data.nome) return 'Informe seu nome ou o do seu negócio';

    const len = data.whatsappDigits.length;
    if (len !== 10 && len !== 11) return 'Informe um WhatsApp válido com DDD';

    if (!data.segmento)         return 'Selecione seu segmento';
    if (!data.melhorar.length)  return 'Selecione ao menos uma opção do que precisa melhorar';
    if (!data.investimento)     return 'Selecione a faixa de investimento';
    return null;
  }

  function isFormValid() {
    return validate(collectData()) === null;
  }

  // ---- Reatividade: o botão "Analisar perfil" só habilita APÓS o envio ----
  function notifyChange() {
    const btn = document.getElementById('btn-analisar-form');
    const copy = document.getElementById('form-analysis-copy');
    if (!btn) return;

    const enabled = hasSubmitted && isFormValid();
    btn.disabled = !enabled;
    btn.classList.toggle('is-ready', enabled);

    if (copy) {
      copy.textContent = hasSubmitted
        ? 'Solicitação enviada. Pode abrir o diagnóstico do seu perfil agora.'
        : 'Envie sua solicitação para liberar o diagnóstico do seu perfil — uma leitura objetiva da sua presença digital, preparada pelo nosso time.';
    }
  }

  function initLiveValidation() {
    const form = document.getElementById('form-lead');
    if (!form) return;
    form.addEventListener('input',  notifyChange);
    form.addEventListener('change', notifyChange);
    notifyChange();
  }

  // ---- Máscara de telefone — aceita 10 ou 11 dígitos ----
  function initPhoneMask() {
    const input = document.getElementById('field-whatsapp');
    if (!input) return;

    input.addEventListener('input', (e) => {
      const v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length === 0)       e.target.value = '';
      else if (v.length <= 2)   e.target.value = `(${v}`;
      else if (v.length <= 6)   e.target.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
      else if (v.length <= 10)  e.target.value = `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
      else                      e.target.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    });
  }

  // ---- Mensagem natural para Bella (Contexto A — antecipar atendimento) ----
  function buildAnteciparMessage(data) {
    const partes = ['Olá! Acabei de mandar uma solicitação pelo site.'];
    if (data.nome)     partes.push(`Sou ${data.nome}.`);
    if (data.segmento) partes.push(`Trabalho com ${SEGMENTO_LABEL[data.segmento] || data.segmento}.`);

    if (data.melhorar?.length) {
      const itens = data.melhorar.map(m => MELHORAR_LABEL[m] || m);
      const lista = itens.length === 1
        ? itens[0]
        : itens.length === 2
          ? `${itens[0]} e ${itens[1]}`
          : `${itens.slice(0, -1).join(', ')} e ${itens.slice(-1)[0]}`;
      partes.push(`Quero evoluir ${lista}.`);
    }

    partes.push('Posso conversar agora?');
    return partes.join(' ');
  }

  // ---- WhatsApp (uso interno + exposto) ----
  function openWhatsApp(message) {
    const text = encodeURIComponent(
      message || 'Olá! Tenho uma dúvida sobre o Estúdio Benjamim.'
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  // ---- Envio do form (sem navegação) — retorna true em sucesso ----
  async function persistLead() {
    const data = collectData();
    formData = data;
    sessionStorage.setItem('lead', JSON.stringify(data));

    if (!WEBHOOK_URL) {
      // Dev: simula latência
      await new Promise(r => setTimeout(r, 600));
      hasSubmitted = true;
      notifyChange();
      return true;
    }

    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome:         data.nome,
        whatsapp:     data.whatsapp,
        segmento:     data.segmento,
        melhorar:     data.melhorar,
        investimento: data.investimento,
        observacao:   data.observacao,
        source:       'hub-benjamim',
        timestamp:    new Date().toISOString(),
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    hasSubmitted = true;
    notifyChange();
    return true;
  }

  // ---- Envio padrão (botão Enviar) → vai pra confirmação ----
  async function submit(e) {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const data  = collectData();
    const error = validate(data);
    if (error) { Toast.show('⚠️', error); return; }

    isSubmitting = true;
    setBtnLoading('btn-submit', true);

    try {
      await persistLead();
      Screens.navigateTo('confirm');
    } catch (err) {
      Toast.show('⚠️', 'Não conseguimos enviar agora. Tente de novo em instantes.');
    } finally {
      // Cooldown breve para evitar duplo envio
      setTimeout(() => {
        isSubmitting = false;
        setBtnLoading('btn-submit', false);
      }, 600);
    }
  }

  // ---- Botão "Analisar perfil" — só dispara após o envio do form ----
  function openAnalysisFromForm() {
    if (!hasSubmitted) {
      Toast.show('⚠️', 'Envie o formulário primeiro para liberar o diagnóstico.');
      return;
    }
    Analysis.open();
  }

  function setBtnLoading(id, loading) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('is-loading', loading);
    btn.disabled = loading;
  }

  // ---- API pública ----
  function getFormData() {
    if (formData.nome) return formData;
    try { return JSON.parse(sessionStorage.getItem('lead') || '{}'); }
    catch { return {}; }
  }

  function getWaNumber() {
    return WA_NUMBER;
  }

  // ---- Init ----
  function init() {
    initCheckboxes();
    initPhoneMask();
    initLiveValidation();

    document.getElementById('form-lead')?.addEventListener('submit', submit);
    document.getElementById('btn-submit')?.addEventListener('click', submit);
    document.getElementById('btn-analisar-form')?.addEventListener('click', openAnalysisFromForm);

    document.getElementById('btn-whatsapp')?.addEventListener('click', () => openWhatsApp());

    document.getElementById('btn-antecipar')?.addEventListener('click', () => {
      openWhatsApp(buildAnteciparMessage(getFormData()));
    });

    document.getElementById('btn-back')?.addEventListener('click', () => Screens.back());
  }

  return { init, getFormData, openWhatsApp, getWaNumber, isFormValid };

})();
