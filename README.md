# Hub Benjamim

Site/hub principal do Estúdio Benjamim. SPA de 4 telas: Hub → Formulário → Confirmação → Análise de Perfil (modal).

## Stack

- HTML/CSS/JS vanilla (sem framework)
- PP Editorial New (local, `/assets/fonts/`)
- Oswald via Google Fonts
- GSAP 3 (animações, progressivo)
- Sem build step — abre direto no browser

## Estrutura

```
hub-benjamim/
├── index.html
├── css/
│   ├── tokens.css      ← design tokens (cores, fontes, espaçamentos)
│   ├── reset.css
│   ├── base.css        ← utilitários, screens, tipografia
│   ├── components.css  ← botões, campos, toast, progress, preloader
│   ├── sections.css    ← as 4 telas + modal
│   └── responsive.css  ← breakpoints mobile-first
├── js/
│   ├── screens.js      ← navegação entre telas
│   ├── form.js         ← formulário + webhook + máscara tel
│   ├── analysis.js     ← modal análise Instagram
│   ├── animations.js   ← GSAP + preloader
│   └── app.js          ← init, Toast global
├── assets/
│   └── fonts/          ← PPEditorialNew-Italic.woff2, PPEditorialNew-Regular.woff2
└── docs/
    └── DEPLOY.md
```

## Desenvolvimento local

```bash
# Opção 1: VS Code Live Server
# Clique em "Go Live" na barra inferior

# Opção 2: npx serve
npx serve .

# Opção 3: Python
python -m http.server 3000
```

## Configuração antes do deploy

Ver `docs/DEPLOY.md` para:
- Número do WhatsApp
- URL do webhook de leads (Make/n8n)
- URL do webhook de análise
- Domínio

## Fluxo

```
Hub
 ├── [Solicitar proposta] → Formulário → Confirmação
 │                                          ├── [Antecipar atendimento] → WhatsApp
 │                                          └── [Analisar perfil] → Modal análise → WhatsApp
 └── [Tirar uma dúvida] → WhatsApp direto
```
