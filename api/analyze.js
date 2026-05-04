'use strict';

// ---- Proxy de imagem (contorna bloqueio do CDN do Instagram) ----
function imgProxy(url) {
  if (!url) return null;
  return 'https://images.weserv.nl/?url=' + encodeURIComponent(url) + '&n=-1';
}

async function handler(req, res) {
  const { handle, lead } = req.body || {};

  if (!handle || typeof handle !== 'string') {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'handle is required' }));
    return;
  }

  const cleanHandle = handle.replace(/^@+/, '').toLowerCase().trim();

  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) {
    process.stdout.write('[ERROR] APIFY_TOKEN não configurado\n');
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Serviço não configurado. Contate o suporte.' }));
    return;
  }

  try {
    // ---- 1. Busca perfil real no Instagram via Apify ----
    const apifyUrl =
      'https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items' +
      '?token=' + APIFY_TOKEN + '&timeout=50&memory=256';

    const apifyRes = await fetch(apifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [cleanHandle],
        resultsType: 'details',
        resultsLimit: 1,
      }),
    });

    if (!apifyRes.ok) {
      const text = await apifyRes.text().catch(() => '');
      process.stdout.write('[ERROR] Apify ' + apifyRes.status + ' ' + text + '\n');
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Erro ao buscar perfil: ' + apifyRes.status }));
      return;
    }

    const items = await apifyRes.json();

    if (!Array.isArray(items) || items.length === 0) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Perfil não encontrado ou privado.' }));
      return;
    }

    const p = items[0];

    if (p.private && !p.followersCount) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Perfil privado — não foi possível analisar.' }));
      return;
    }

    // ---- 2. Mapeia para o contrato do frontend ----
    const lastRaw = (p.latestPosts || [])[0] || null;

    const profile = {
      handle    : p.username       || cleanHandle,
      fullName  : p.fullName       || p.username || cleanHandle,
      avatar    : imgProxy(p.profilePicUrlHD || p.profilePicUrl),
      bio       : p.biography      || '',
      followers : p.followersCount || 0,
      following : p.followsCount   || 0,
      posts     : p.postsCount     || 0,
      isVerified: p.verified       || false,
      isPrivate : p.private        || false,
      lastPost  : lastRaw ? {
        thumb   : imgProxy(lastRaw.displayUrl || lastRaw.thumbnailSrc),
        likes   : lastRaw.likesCount    || 0,
        comments: lastRaw.commentsCount || 0,
        caption : lastRaw.caption       || '',
      } : null,
    };

    // ---- 3. Gera insights (IA ou fallback heurístico) ----
    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

    if (ANTHROPIC_KEY) {
      const insights = await generateInsightsWithAI(profile, lead, ANTHROPIC_KEY);
      Object.assign(profile, insights);
    } else {
      profile.bioInsight  = bioInsightFallback(profile);
      profile.postInsight = postInsightFallback(profile);
      profile.copy        = copyFallback(profile);
    }

    res.writeHead(200);
    res.end(JSON.stringify(profile));

  } catch (err) {
    process.stdout.write('[ERROR] analyze: ' + err.message + '\n');
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Não conseguimos analisar agora. Tente em instantes.' }));
    }
  }
}

// ============================================================
//  Geração de insights com IA (Anthropic Claude)
// ============================================================

async function generateInsightsWithAI(profile, lead, apiKey) {
  const { handle, fullName, bio, followers, following, posts, lastPost } = profile;
  const postCaption = lastPost ? lastPost.caption : '';
  const engRate = (followers > 0 && lastPost)
    ? (((lastPost.likes + lastPost.comments) / followers) * 100).toFixed(1)
    : null;

  const prompt = 'Você é um estrategista de marca digital. Analise o perfil do Instagram abaixo e gere 3 textos de diagnóstico em português brasileiro. Seja direto, perspicaz e use linguagem de consultoria — não use emojis, não seja genérico.\n\n' +
    'PERFIL:\n' +
    '- Handle: @' + handle + '\n' +
    '- Nome: ' + fullName + '\n' +
    '- Bio: "' + (bio || '(vazia)') + '"\n' +
    '- Seguidores: ' + followers.toLocaleString('pt-BR') + '\n' +
    '- Seguindo: ' + following.toLocaleString('pt-BR') + '\n' +
    '- Posts: ' + posts + '\n' +
    (engRate ? '- Taxa de engajamento (último post): ' + engRate + '%\n' : '') +
    (postCaption ? '- Legenda do último post: "' + postCaption.slice(0, 200) + '"\n' : '') +
    '\nGere exatamente este JSON (sem mais nada, sem markdown):\n' +
    '{\n' +
    '  "bioInsight": "<1-2 frases sobre o que a bio revela ou deixa a desejar como posicionamento de marca.>",\n' +
    '  "postInsight": "<1-2 frases sobre a presença digital, frequência e potencial com base nos números reais.>",\n' +
    '  "copy": "<1 frase de fechamento que conecta o diagnóstico à oportunidade de crescimento. Tom consultivo, não de vendas.>"\n' +
    '}';

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type'     : 'application/json',
        'x-api-key'        : apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model     : 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages  : [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiRes.ok) throw new Error('Anthropic ' + aiRes.status);

    const aiData = await aiRes.json();
    const raw    = (aiData.content && aiData.content[0] && aiData.content[0].text) || '';
    const match  = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON não encontrado na resposta da IA');

    const parsed = JSON.parse(match[0]);
    return {
      bioInsight : parsed.bioInsight  || bioInsightFallback(profile),
      postInsight: parsed.postInsight || postInsightFallback(profile),
      copy       : parsed.copy        || copyFallback(profile),
    };
  } catch (err) {
    process.stdout.write('[WARN] AI insight falhou, usando fallback: ' + err.message + '\n');
    return {
      bioInsight : bioInsightFallback(profile),
      postInsight: postInsightFallback(profile),
      copy       : copyFallback(profile),
    };
  }
}

// ============================================================
//  Fallbacks heurísticos
// ============================================================

function bioInsightFallback({ bio, followers }) {
  const b = (bio || '').trim();
  const f = Number(followers) || 0;

  if (!b)
    return 'Sua bio está vazia — é o primeiro espaço de marca, e hoje ele não trabalha por você.';
  if (b.length < 50)
    return 'Sua bio é direta, mas ainda não carrega o peso da marca. Quem chega ao perfil precisa entender em segundos o que você faz — e por que você, não outro.';
  if (f > 10000)
    return 'A bio funciona, mas com essa audiência o padrão sobe. Falta uma proposta de valor mais afiada — não apenas o que você faz, mas o ângulo que só você tem.';
  return 'A bio comunica o que você faz, mas ainda fala mais como serviço do que como marca. Falta o ângulo que diferencia.';
}

function postInsightFallback({ posts, followers, lastPost }) {
  const p  = Number(posts)     || 0;
  const f  = Number(followers) || 0;
  const lp = lastPost || {};

  if (p < 12)
    return 'Pouco volume publicado — o algoritmo ainda não tem repertório seu para distribuir. Frequência cria presença.';
  if (p < 50)
    return 'Você posta com regularidade, mas sem repetição visual — falta um sistema que ancore a marca em cada peça.';
  if (f > 0 && lp.likes != null) {
    const eng = ((lp.likes + lp.comments) / f) * 100;
    if (eng > 5)
      return 'Engajamento acima da média para o segmento. Agora o salto é em estratégia: cada post deveria carregar uma intenção clara de negócio.';
    if (eng < 0.8)
      return 'Volume alto, mas engajamento abaixo do potencial — o conteúdo chega, mas não conecta. A questão não é frequência, é relevância.';
  }
  return 'Volume consistente, boa presença. Agora o salto é em estratégia: cada post deveria carregar uma intenção clara.';
}

function copyFallback({ followers, posts }) {
  const f = Number(followers) || 0;
  const p = Number(posts)     || 0;

  if (f > 10000 && p > 100) return 'Você já está no caminho. Vamos acelerar juntos.';
  if (f > 5000)              return 'Existe uma audiência real. Falta a estratégia que converte presença em negócio.';
  if (f > 1000)              return 'A base está construída. Agora é hora de fazer o digital trabalhar pelo negócio.';
  if (p < 20)                return 'Tem muito espaço pra crescer. O ponto de partida certo encurta o caminho.';
  return 'Seu negócio é excelente. Seu digital ainda não conta essa história.';
}

module.exports = handler;
