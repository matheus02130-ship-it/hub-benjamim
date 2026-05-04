# Deploy — Hub Benjamim

## Vercel (recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Na pasta do projeto
cd hub-benjamim
vercel

# 3. Deploy de produção
vercel --prod
```

A configuração já está no `vercel.json` (cleanUrls, cache imutável de fontes/svg/img, headers de segurança).

## Netlify

Arraste a pasta `hub-benjamim/` para o painel do Netlify. O `vercel.json` é ignorado — configure equivalente em `netlify.toml` se for este o destino.

## Configurações pós-deploy

### 1. WhatsApp
[js/form.js](../js/form.js) linha ~12:
```js
const WA_NUMBER = '5511999999999'; // DDI + DDD + número, só dígitos
```

### 2. Webhook de leads
[js/form.js](../js/form.js) linha ~10:
```js
const WEBHOOK_URL = 'https://hook.make.com/...';
```

Formato enviado (POST `application/json`):
```json
{
  "nome": "Matheus França",
  "whatsapp": "(11) 99999-9999",
  "segmento": "saude-estetica",
  "melhorar": ["marca", "presenca-digital"],
  "investimento": "5k-10k",
  "observacao": "Texto livre",
  "source": "hub-benjamim",
  "timestamp": "2026-05-03T18:42:00.000Z"
}
```

### 3. Webhook de análise de perfil

**Esta é a peça que faz a análise ser real.** Sem ela, o modal cai num mock determinístico para dev (mesmo @ devolve sempre o mesmo cenário) — útil para demos, mas não representa o perfil de fato.

[js/analysis.js](../js/analysis.js) linha ~37:
```js
const ANALYSIS_WEBHOOK = 'https://hook.make.com/...';
```

**Request enviado pelo frontend** (POST `application/json`):
```json
{
  "handle": "perfilhandle",
  "lead": { "nome": "...", "whatsapp": "...", "segmento": "...", ... },
  "timestamp": "2026-05-03T18:42:00.000Z"
}
```

**Response esperada do webhook** (200 OK, `application/json`):
```json
{
  "handle":     "perfilhandle",
  "followers":  1234,
  "posts":      67,
  "avatar":     "https://...jpg",
  "bio":        "Texto da bio do Instagram",
  "fullName":   "Nome no Instagram",
  "isVerified": false,
  "isPrivate":  false,
  "scores": {
    "identidade": 38,
    "presenca":   28,
    "potencial":  82
  },
  "tags": [
    { "label": "negócio forte",  "type": "positive" },
    { "label": "digital fraco",  "type": "negative" }
  ],
  "copy": "Seu negócio é excelente. Seu digital ainda não conta essa história."
}
```

Campos:
- `handle`, `followers`, `posts`, `scores.{identidade,presenca,potencial}`: **obrigatórios**.
- `avatar`: URL pública da foto de perfil. Se ausente, mostra fallback com a inicial do @.
- `bio`, `fullName`, `isVerified`, `isPrivate`: opcionais — só `bio` é renderizada hoje.
- `tags`: opcional. Se não vier, é gerado a partir dos scores.
- `copy`: opcional. Se não vier, é gerado cruzando os 3 scores.

**Timeout do frontend:** 20s. O backend deve responder antes disso ou abortamos.

#### Como implementar o webhook

Recomendação: **Make** ou **n8n** acionando um scraper de Instagram. Opções avaliadas:

| Provedor | Custo | Notas |
|---|---|---|
| **Apify — `jaroslavhejlek/instagram-scraper`** | ~$0.001/perfil | Mais usado, bem mantido. Devolve avatar, bio, contadores |
| **RapidAPI — Instagram Scraper API** | a partir de free tier | Latência maior; limites baixos no free |
| **Instagrapi (Python self-hosted)** | infra própria | Requer manter sessão; mais frágil |

Os **scores** (identidade/presença/potencial) **não vêm prontos do scraper** — eles devem ser calculados pelo seu webhook a partir dos dados crus. Sugestão de heurística inicial:

- **Identidade visual** (0–100): consistência da paleta nos últimos 12 posts + presença/qualidade da foto de perfil + bio bem escrita. Pode usar um modelo de visão (GPT-4o vision) para classificar.
- **Presença digital** (0–100): frequência de posts (últimos 30 dias) + engagement médio + recência da última publicação.
- **Potencial do negócio** (0–100): seguidores ÷ benchmark do segmento + sinais de profissionalização (link na bio, contato, categoria, posts comerciais).

Você passa o segmento do lead (`lead.segmento`) pra calibrar o benchmark — ex: gastronomia tem média de seguidores diferente de consultoria.

### 4. Domínio

Conectar `estudiobenjamim.com.br` (ou subdomínio) nas configurações do Vercel/Netlify. Atualizar também:
- `og:url` em [index.html](../index.html) linha ~14
- `meta description` se desejar variação
