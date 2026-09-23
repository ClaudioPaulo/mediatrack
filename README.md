# MediaTrack

App para seguires filmes, séries, doramas, animes, mangas e livros num só lugar — com pesquisa unificada (TMDB + AniList + Open Library), biblioteca pessoal por estado e avaliações com estrelas e notas.

Web app responsiva (Next.js 14 + Tailwind), funciona no browser do computador e do telemóvel, e pode ser "instalada" no ecrã inicial do telemóvel como PWA.

---

## 1. Pré-requisitos

- Node.js 18.18 ou superior (`node -v` para confirmar)
- Uma conta grátis em [supabase.com](https://supabase.com)
- Uma conta grátis em [themoviedb.org](https://www.themoviedb.org) (para a API Key do TMDB)

---

## 2. Criar o projeto Supabase

1. Cria um novo projeto em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Vai a **SQL Editor** → **New query**, cola todo o conteúdo de `supabase/schema.sql` e executa (`Run`). Isto cria as tabelas, enums, RLS e o trigger de criação automática de perfil.
3. Vai a **Authentication → Sign In / Providers → Email** e confirma que o provider "Email" está ativo, com **"Confirm email"** e **OTP** ativados (por definição já vêm ativos).
4. Vai a **Authentication → Sessions** e define a duração da sessão (**"Time-box user sessions"** ou **"Refresh token expiry"**, dependendo da versão do painel) para **30 dias**, para que o utilizador não precise de fazer login com frequência.
5. Vai a **Project Settings → API** e copia:
   - `Project URL` → vai para `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → vai para `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Obter a chave da TMDB

1. Cria conta em [themoviedb.org](https://www.themoviedb.org/signup).
2. Vai a **Settings → API**, pede uma API key (gratuita, aprovação automática).
3. Copia o **"API Read Access Token"** (token longo, começa por `eyJ...`, é o de autenticação v4) → vai para `NEXT_PUBLIC_TMDB_ACCESS_TOKEN`.

AniList e Open Library não precisam de registo nem de chave — são APIs públicas.

---

## 4. Configurar o projeto localmente

```bash
# 1. Entra na pasta do projeto
cd mediatrack

# 2. Copia o template de variáveis de ambiente
cp .env.example .env.local

# 3. Edita .env.local e preenche os 3 valores obtidos nos passos 2 e 3 acima
```

---

## 5. Instalar dependências e arrancar

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) no browser do computador.

Para testares no telemóvel na mesma rede Wi-Fi, usa o IP local da tua máquina em vez de `localhost`, por exemplo:

```bash
# descobre o teu IP local (Mac/Linux)
ipconfig getifaddr en0

# depois no telemóvel abre:
http://SEU_IP_LOCAL:3000
```

Para "instalar" como app no telemóvel: abre o endereço no Safari (iOS) ou Chrome (Android) e escolhe **"Adicionar ao ecrã principal"**.

---

## 6. Fluxo de utilização

1. Ecrã de login → introduz o e-mail → recebes um código de 6 dígitos por e-mail → introduz o código para entrares.
2. No dashboard, usa a barra de pesquisa para procurar em simultâneo filmes/séries/doramas (TMDB), animes/mangas (AniList) e livros (Open Library).
3. Clica num resultado para abrir o modal de detalhes, onde defines o estado (a ver/ler, concluído, por ver/ler, favorito), avaliação de 1 a 5 estrelas e notas pessoais.
4. Usa o botão rápido "+ Biblioteca" no canto do poster para adicionares diretamente à lista "Por ver / ler" sem abrir o modal.
5. O dashboard organiza tudo em carrosséis por estado, mais uma secção de recomendações baseada nos géneros dos teus itens concluídos/favoritos.
6. Ao preencheres o episódio/capítulo/página atual e esse número atingir o total conhecido do item (ex.: episódio 24 de 24), o estado passa automaticamente para "Concluído" — não precisas de mudar o estado à mão. Se já tiveres marcado como "Favorito", isso não é substituído.

---

## 7. Deploy em produção (opcional)

Desde a conversão para export estático (necessária para a app mobile), o
resultado de `npm run build` é a pasta `out/` — HTML/JS/CSS puro, sem
servidor. Podes alojar em qualquer CDN estática: [Vercel](https://vercel.com)
continua a funcionar bem (deteta automaticamente o export estático), mas
também funciona em Netlify, Cloudflare Pages ou GitHub Pages.

```bash
npm i -g vercel
vercel
```

Configura as 3 variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TMDB_ACCESS_TOKEN`) no painel do projeto na Vercel, tal como no `.env.local`.

---

## 8. Estrutura do projeto

```
mediatrack/
├── supabase/schema.sql          # SQL completo (tabelas, enums, RLS, trigger)
├── middleware.ts                # Refresh de sessão + proteção de rotas
├── lib/
│   ├── auth.ts                  # Magic Link / OTP
│   ├── supabase/                # Clientes Supabase (browser + server)
│   └── api/
│       ├── types.ts             # Estrutura NormalizedMedia unificada
│       ├── tmdb.ts               # Filmes, séries, doramas
│       ├── anilist.ts            # Animes e mangas
│       ├── openLibrary.ts        # Livros
│       ├── search.ts             # Pesquisa unificada (as 3 fontes em paralelo)
│       └── library.ts            # CRUD biblioteca + reviews no Supabase
├── components/
│   ├── SearchBar.tsx             # Pesquisa com debouncing
│   ├── MediaCard.tsx             # Card de poster + ação rápida
│   ├── Carousel.tsx              # Linha horizontal do dashboard
│   ├── StarRating.tsx            # Rating 1-5 estrelas
│   └── MediaDetailsModal.tsx     # Modal de detalhes/edição
├── hooks/useDebounce.ts
└── app/
    ├── login/page.tsx            # Ecrã de login (email + OTP)
    └── dashboard/page.tsx        # Dashboard principal
```

---

## 9. Manter o Supabase ativo durante períodos sem uso (férias, etc.)

No plano gratuito, o Supabase **pausa automaticamente** um projeto ao fim de **7 dias sem pedidos à API**. Se a família for de férias e ninguém abrir a app durante esse tempo, o projeto fica pausado e a app deixa de funcionar até alguém o reativar manualmente no painel.

Este repositório já inclui a solução: um "ping" automático a cada 3 dias.

**O que já está feito:**
- `supabase/schema.sql` tem uma função `keepalive_ping()` que só devolve a hora do servidor — não lê nem escreve nenhum dado real, é só para gerar atividade na API.
- `.github/workflows/supabase-keepalive.yml` corre no GitHub Actions a cada 3 dias e chama essa função.

**O que falta fazeres tu (uma vez só):**

1. Se já tinhas corrido o `schema.sql` antes desta atualização, volta a colar o ficheiro completo no **SQL Editor** do Supabase e corre-o de novo (é seguro repetir — só adiciona a função nova, não apaga nada).
2. No GitHub, vai ao repositório → **Settings → Secrets and variables → Actions → New repository secret** e cria dois secrets:
   - `SUPABASE_URL` → o mesmo valor de `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` → o mesmo valor de `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Garante que o repositório está no GitHub com Actions ativo (por definição já vem ativo em repositórios normais).

A partir daí corre sozinho — podes confirmar em **Actions** no separador do repositório, e também correr manualmente a qualquer momento com o botão "Run workflow".

> Nota: isto só evita a pausa por inatividade. Não é um backup — os dados continuam só no Supabase. Se quiseres mesmo estar descansado, o Supabase também tem export/backup manual no painel (**Database → Backups**).

---

## 10. App mobile (iOS + Android)

O projeto já está preparado como app nativa via [Capacitor](https://capacitorjs.com), reaproveitando todo o código React.

**O que já vem incluído:**
- Sessão guardada de forma encriptada (Keychain/Keystore), não em `localStorage` simples.
- Bloqueio por Face ID / impressão digital / PIN ao abrir a app (toggle nas Definições, dentro da app).
- Modo offline: a biblioteca fica em cache local e continua visível sem internet.
- Lembretes locais para continuares títulos a meio.
- Ícone e splash screen de marca já gerados para as duas plataformas.

**Comandos:**

```bash
npm run mobile:build          # next build (export estático) + cap sync
npm run mobile:open:android   # abre no Android Studio
npm run mobile:open:ios       # abre no Xcode (só em macOS)
npm run mobile:icons          # regenera ícones/splash a partir de assets/icon-source.svg
```

Para o passo a passo completo de build, assinatura e submissão às lojas, vê **[STORE_SUBMISSION_GUIDE.md](./STORE_SUBMISSION_GUIDE.md)**. O texto pronto para as fichas das lojas (título, descrição, palavras-chave) está em **[STORE_LISTING_COPY.md](./STORE_LISTING_COPY.md)**. A política de privacidade (exigida pelas duas lojas) está em `docs/privacy-policy.html`, pronta a publicar via GitHub Pages. O build de iOS pode correr automaticamente sem Mac via `.github/workflows/ios-testflight.yml` (detalhes na secção 5 do guia de submissão).

---

## 11. Notas de produção

- **RLS**: cada utilizador só acede à sua própria biblioteca e reviews; `media_items` é uma cache partilhada e de leitura para todos os autenticados.
- **Rate limits**: TMDB e AniList têm limites de pedidos por segundo generosos para uso normal; se escalares para muitos utilizadores simultâneos, considera cache adicional no servidor.
- **Imagens**: o Next.js Image está configurado (`next.config.js`) para os domínios de capas do TMDB, AniList e Open Library.
