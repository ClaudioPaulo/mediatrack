# Guia de publicação — MediaTrack (App Store + Play Store)

Este guia assume que ainda não tens nenhuma conta de developer. Segue por
ordem — cada secção depende da anterior.

---

## 0. Antes de tudo: publica a Política de Privacidade

As duas lojas exigem um URL público.

1. Abre o teu repositório no GitHub → **Settings → Pages**.
2. Em "Source", escolhe **Deploy from a branch**, branch `main`, pasta `/docs`.
3. Guarda. Ao fim de ~1 minuto a página fica disponível em:
   `https://<o-teu-user>.github.io/<repo>/privacy-policy.html`
4. Antes disso, edita `docs/privacy-policy.html` e `PRIVACY_POLICY.md` e
   substitui `SUBSTITUI-PELO-TEU-EMAIL` pelo teu contacto real.
5. Guarda esse link — vais precisar dele em App Store Connect e no Play
   Console.

---

## 1. Contas de developer

| | Custo | Tempo de aprovação | Link |
|---|---|---|---|
| Apple Developer Program | 99 USD/ano | normalmente 24-48h (pode pedir verificação de identidade) | developer.apple.com/programs |
| Google Play Console | 25 USD (pagamento único) | normalmente algumas horas a 2 dias | play.google.com/console |

Cria as duas contas com o mesmo e-mail que vais usar como contacto de
suporte da app. Para a Apple, se fores publicar como pessoa singular
(não empresa), escolhe "Individual" — é mais rápido.

---

## 2. Preparar o projeto para build

No teu computador, dentro da pasta do projeto:

```bash
npm install
cp .env.example .env.local   # preenche com as tuas chaves reais do Supabase
npm run mobile:build          # next build (export estático) + cap sync
```

Isto gera a pasta `out/` e sincroniza-a para `android/` e `ios/`. Repete
`npm run mobile:build` sempre que alterares código React — o Xcode/Android
Studio não veem as alterações sozinhos.

---

## 3. Build e submissão Android (mais simples, começa por aqui)

**Precisas de:** Android Studio instalado (gratuito, Windows/Mac/Linux).

1. `npm run mobile:open:android` — abre o projeto no Android Studio.
2. Espera o Gradle sincronizar (primeira vez demora alguns minutos).
3. **Cria a chave de assinatura** (só uma vez, guarda-a para sempre — se a
   perderes nunca mais consegues atualizar a app):
   `Build → Generate Signed Bundle / APK → Android App Bundle` → "Create new"
   → preenche os dados e uma password forte → guarda o ficheiro `.jks` num
   local seguro (ex.: gestor de passwords + backup), **nunca no Git**.
4. Gera o `.aab`: `Build → Generate Signed Bundle / APK → Android App Bundle`
   → escolhe a keystore criada → `release`.
5. No **Play Console** → "Criar app" → preenche nome (MediaTrack), idioma
   (Português), tipo (App), gratuita.
6. Preenche as secções obrigatórias no menu lateral (todas têm de estar
   verdes antes de poderes submeter):
   - **Store listing**: descrição curta/longa, categoria (Entretenimento),
     screenshots (mínimo 2, no telemóvel: `adb exec-out screencap -p > s1.png`
     ou captura de ecrã normal), ícone 512×512 (usa
     `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` como base,
     ou pede-me para gerar um PNG 512×512 à parte).
   - **Privacy Policy**: cola o URL do GitHub Pages.
   - **App content → Data safety**: declara que recolhes e-mail e "App
     activity" (a tua biblioteca), que os dados são encriptados em trânsito,
     e que o utilizador pode pedir eliminação.
   - **Target audience**: não direcionada a crianças.
7. Cria uma "Internal testing release", faz upload do `.aab`, adiciona o teu
   próprio e-mail como testador, e testa a instalação antes de avançar para
   produção.
8. Quando estiver tudo verde: `Release → Production → Create release` → sobe
   o mesmo `.aab` → enviar para revisão.

---

## 4. Build e submissão iOS

**Precisas de:** um Mac com Xcode (gratuito, mas só corre em macOS).
Se não tens Mac, vê a secção 5 abaixo — dá para fazer isto sem ter Mac.

1. `npm run mobile:open:ios` — abre o projeto no Xcode.
2. Seleciona o projeto "App" → separador **Signing & Capabilities** →
   escolhe a tua conta Apple Developer em "Team" (Xcode trata dos
   certificados automaticamente com "Automatically manage signing" ligado).
3. Confirma o **Bundle Identifier**: `com.kaplacc.mediatrack` (tem de bater
   certo com o que vais criar em App Store Connect no passo seguinte).
4. Em **App Store Connect** (appstoreconnect.apple.com) → "Apps" → "+" →
   "New App" → preenche nome, idioma principal, Bundle ID (escolhe o mesmo
   `com.kaplacc.mediatrack` da lista), SKU (qualquer identificador único,
   ex. `mediatrack001`).
5. No Xcode: `Product → Archive` (só funciona com um dispositivo físico ou
   "Any iOS Device" selecionado, nunca um simulador).
6. Quando o Archive terminar, abre o **Organizer** → "Distribute App" →
   "App Store Connect" → segue o assistente até "Upload".
7. Volta a App Store Connect → a build aparece em "TestFlight" ao fim de
   uns minutos a ~1h (processamento da Apple).
8. Preenche a ficha da app: descrição, categoria, screenshots (obrigatório
   para iPhone 6.7" e 6.5" — usa o simulador do Xcode para capturar, ou o
   teu próprio iPhone), ícone (gerado automaticamente a partir do
   `AppIcon.appiconset` que já está no projeto), URL da política de
   privacidade, e a secção **App Privacy** (mesmas declarações do passo 6
   da Play Store: e-mail + dados de utilização, sem partilha com terceiros).
9. Associa a build enviada em "Build" e clica "Submit for Review".

**Nota importante (Apple Guideline 4.2):** a Apple rejeita apps que pareçam
"só um site dentro de uma app". Como já implementámos armazenamento seguro,
bloqueio biométrico, notificações locais e modo offline nativos, a app tem
funcionalidade nativa genuína — mas garante que testas tudo isso num
dispositivo real antes de submeter, e menciona essas funcionalidades na
descrição da App Store.

---

## 5. Não tens Mac? CI automático já está montado

O repositório já inclui `.github/workflows/ios-testflight.yml`: compila a app
num runner macOS do GitHub (gratuito, incluído no plano Actions) e envia
automaticamente para o TestFlight — nunca precisas de tocar num Mac.

**Só funciona depois de teres a conta Apple Developer.** Quando a tiveres,
configura estes secrets em **Settings → Secrets and variables → Actions**
do repositório:

| Secret | Onde encontrar |
|---|---|
| `APPLE_ID` | O e-mail da tua conta Apple Developer |
| `APPLE_TEAM_ID` | developer.apple.com/account → Membership → "Team ID" (10 carateres) |
| `ASC_KEY_ID` | App Store Connect → Users and Access → Integrations → Keys → cria uma chave (acesso "App Manager") → coluna "Key ID" |
| `ASC_ISSUER_ID` | Mesma página, no topo: "Issuer ID" |
| `ASC_KEY_CONTENT` | Depois de criares a chave, descarrega o `.p8` (só é permitido uma vez) → corre `base64 -i AuthKey_XXXX.p8 \| pbcopy` (Mac) ou `certutil -encode AuthKey_XXXX.p8 tmp.b64` (Windows) → cola o resultado como valor do secret |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Os mesmos já configurados para o keep-alive (secção 9) |
| `TMDB_ACCESS_TOKEN` | O mesmo token do teu `.env.local` |

Também precisas de ter criado a app em App Store Connect uma vez (passo 4.4
acima) antes de correr o workflow, porque o `upload_to_testflight` precisa
que a app já exista lá.

Para correr: separador **Actions** do repositório → "iOS build & TestFlight
upload" → **Run workflow**. Demora tipicamente 10-20 minutos. No fim, a
build aparece em TestFlight tal como se tivesses feito upload manualmente
pelo Xcode — falta só preencheres a ficha da app (secção 4.8) e submeter.

> A primeira vez que este workflow corre para um `com.kaplacc.mediatrack`
> ainda sem certificados, o `-allowProvisioningUpdates` cria-os
> automaticamente — não precisas de gerar nada à mão primeiro.

**Alternativa sem CI:** pedir emprestado um Mac só para os passos 4.5-4.6
(Archive + Upload) continua a funcionar, se preferires.

---

## 6. Depois de aprovado

- Guarda a keystore Android e os certificados Apple em local seguro com
  cópia de segurança — sem eles não consegues publicar atualizações.
- Para cada atualização futura: `npm run mobile:build` → sobe o número de
  versão (`android/app/build.gradle` → `versionCode`/`versionName`; no Xcode
  → "General" → "Version"/"Build") → repete os passos de build e upload.
- O ficheiro `.github/workflows/supabase-keepalive.yml` já criado
  anteriormente continua a proteger o teu Supabase de pausar por inatividade
  — nada a fazer aí.
