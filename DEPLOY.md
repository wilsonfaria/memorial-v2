# Deploy no Coolify (Docker) — recomendado

O repositório tem um `Dockerfile` pronto. A cada inicialização o container:
1. aplica as migrations pendentes (`prisma migrate deploy`);
2. copia as imagens de `public/uploads/` (inclusive as miniaturas das edições)
   para o volume, sem nunca sobrescrever;
3. sobe o Next.js na porta 3000.

## 1. Banco de dados

No Coolify, crie um recurso **MariaDB versão 11** (a tabela `_prisma_migrations`
usa a collation `utf8mb3_uca1400_ai_ci`, que não existe antes do 10.10).
Em **Import Backup**, envie o dump do banco (`.sql.gz`) — o dump não tem
`CREATE DATABASE`, então entra no banco selecionado.

## 2. Aplicação

- **Source:** este repositório no GitHub, branch `master`.
- **Build pack:** `Dockerfile` · **Porta:** `3000`.
- **Healthcheck:** `GET /api/health` (já definido no Dockerfile; não gera
  estatística de visita nem conta aparição de banner).
- **Volume persistente** montado em **`/data`** — sem ele, todo deploy apaga
  PDFs e imagens:

| Pasta no volume | Conteúdo | Variável (já definida no Dockerfile) |
|---|---|---|
| `/data/pdfs` | PDFs das edições (`AAAA/MM/edicao-ID.pdf`) | `PDF_STORAGE_ROOT` |
| `/data/uploads` | imagens do admin + `thumbnails/` das edições | `UPLOADS_STORAGE_ROOT` |
| `/data/config` | `db-config.json` / `smtp-config.json` salvos pelo admin | `APP_CONFIG_ROOT` |

## 3. Variáveis de ambiente

| Variável | Valor |
|---|---|
| `DATABASE_URL` | URL **interna** do MariaDB do Coolify (`mysql://usuario:senha@host:3306/banco`) |
| `AUTH_SECRET` | `openssl rand -base64 32` (trocar desloga quem estiver no admin) |
| `SETTINGS_ENCRYPTION_KEY` | a **mesma** usada no ambiente de onde vier o `/data/config`; senão, nova |
| `SITE_URL` / `APP_URL` | domínio final com `https://` |

## 4. Busca no texto dos jornais (Meilisearch)

O texto de cada página dos PDFs fica na tabela `edition_pages` (fonte
oficial) e é pesquisado pelo **Meilisearch** — tolerante a erros de digitação,
o que importa muito para texto de OCR. Sem Meilisearch (ou se ele cair), a
busca usa automaticamente o FULLTEXT do MariaDB.

1. No Coolify, **+ New Resource → Meilisearch** (mesmo projeto/servidor).
2. No app do Memorial, acrescente as variáveis (**Not available during build**):

| Variável | Valor |
|---|---|
| `MEILI_URL` | URL **interna** do serviço, ex.: `http://meilisearch-xxxx:7700` |
| `MEILI_KEY` | a *master key* do serviço (fica só no servidor; o navegador nunca fala com o Meilisearch) |

3. Redeploy e, no admin, **Edições → "Busca no texto dos jornais" → Indexar
   edições sem texto**. Lê o texto de todos os PDFs de `/data/pdfs` em lotes
   curtos (≈1 s por edição); pode fechar a página e rodar de novo depois —
   continua de onde parou.
4. Daqui em diante é automático: upload indexa, lixeira remove, restaurar
   devolve. Se o Meilisearch for recriado, use **Reenviar ao Meilisearch**
   (reconstrói o índice a partir do banco em segundos, sem ler PDFs).

## 5. Transcrição com IA (Google Gemini, plano gratuito)

A IA lê a **imagem** de cada página e transcreve o texto mantendo a ortografia
da época ("instrucção", "idéa", "Collegio"), marcando `[ilegível]`/`[?]`. O
texto fica em `edition_pages.revisedText`, ao lado do OCR original (que nunca é
apagado); a busca usa o revisado e o leitor ganha o botão **Transcrição**.

1. Crie a chave em https://aistudio.google.com/apikey (sem cartão = plano gratuito).
2. No app do Coolify: `GEMINI_API_KEY` (**Not available during build**).
3. Opcional: `GEMINI_MODELS` — lista, em ordem de preferência, dos modelos
   revezados. Padrão (só 3.x aprovados no teste de fidelidade):
   `gemini-3.1-flash-lite,gemini-3.5-flash,gemini-3.6-flash,gemini-3.7-flash,gemini-3.8-flash,gemini-3.5-flash-lite`.
   Não defina a variável no Coolify a menos que queira mudar essa lista.
   As cotas gratuitas são **por modelo e por dia** (o 3.8-flash, p.ex., só 20
   pedidos/dia); quando uma acaba, o próximo modelo assume. Cada página guarda
   qual modelo a transcreveu.
4. No admin, **Edições → Fluxo de processamento**: rode lotes pequenos (N
   próximas ou aleatórias), ou marque edições na lista e escolha a etapa. Cada
   linha mostra PDF / Texto / IA / Busca; ▶ roda o fluxo só naquela edição e
   ↻ refaz a IA dela. Quando a cota do dia acaba, o processo para e continua de
   onde parou no dia seguinte.

5. **Transcrição automática** (mesma tela): o botão **Ligar** faz o servidor
   transcrever sozinho todas as páginas pendentes, sem precisar do navegador
   aberto. Cada modelo respeita seu limite por minuto (Flash Lite 15/min,
   Flash 5/min; `GEMINI_MIN_INTERVAL_MS` força um intervalo fixo), mais a pausa escolhida
   entre páginas; quando a cota do dia acaba, dorme até o Google renovar
   (meia-noite do Pacífico) e continua. `AI_WORKER=off` desativa o recurso.

6. **Revisão humana e qualidade:** em cada edição (ícone de livro), **Conferir**
   marca o texto como certo e **Corrigir** abre a página digitalizada ao lado
   do texto; tudo fica no histórico e pode ser restaurado. **Edições →
   Qualidade da IA** mede o erro (CER/WER) de cada modelo nas páginas
   conferidas.
7. **Pessoas e lugares:** de cada página transcrita a IA extrai as matérias
   (tipo + resumo), as pessoas e os lugares (`GEMINI_EXTRACT_MODELS`, padrão
   `gemini-3.5-flash-lite,gemini-3.1-flash-lite`, 1 pedido por página). O
   site ganha `/pessoas` e `/lugares` — acrescente-os ao menu em **Menus**.
   `npx tsx scripts/extract-entities.ts` extrai pelo terminal.

`scripts/ocr-pilot.ts` compara modelos (NVIDIA, Gemini, Groq) em algumas páginas
e gera um relatório lado a lado — útil antes de trocar de modelo.

## 6. Arquivos das edições

As miniaturas vão pelo Git (`public/uploads/thumbnails`) e são copiadas para o
volume na inicialização. Os PDFs (~4,5 GB) **não** vão no Git nem no dump do
banco: copie-os para `/data/pdfs` (estrutura `AAAA/MM/edicao-ID.pdf`) com
`rsync`/`scp`. O volume precisa pertencer ao usuário `node` do container
(uid 1000) — se o Coolify criá-lo como root, rode `chown -R 1000:1000` na
pasta do volume (`/var/lib/docker/volumes/<nome>/_data`).

---

# Deploy na Hostinger (plano Business, Node.js + Git)

## 1. Crie o banco de dados MySQL

No hPanel: **Bancos de dados → MySQL Databases** → crie um banco, um usuário e defina a senha.
Anote: host (geralmente `localhost` no mesmo servidor), nome do banco, usuário, senha, porta (padrão `3306`).

## 2. Suba este repositório para o GitHub/GitLab

```bash
git remote add origin <url-do-seu-repositorio>
git push -u origin master
```

## 3. Crie a aplicação Node.js no hPanel

**Site → Node.js** → criar aplicação:
- **Versão do Node**: 20.x ou 22.x
- **Modo de deploy**: Git, apontando para o repositório e branch (`master`)
- **Diretório raiz da aplicação**: a pasta onde está este `package.json` (raiz do repo, se você subiu só o conteúdo de `app/`)
- **Comando de instalação**: `npm install` (isso já dispara `postinstall`, que roda `prisma generate` e copia o worker do pdf.js)
- **Comando de build**: `npm run build`
- **Comando de start**: `npm start`
- **Startup/porta**: a Hostinger injeta a variável `PORT` automaticamente; o `next start` já respeita isso.

## 4. Configure as variáveis de ambiente

Na mesma tela do Node.js App, seção **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `mysql://USUARIO:SENHA@HOST:3306/NOME_DO_BANCO` (dados do passo 1) |
| `AUTH_SECRET` | uma string aleatória longa — gere com `openssl rand -hex 32` |
| `SETTINGS_ENCRYPTION_KEY` | outra string aleatória longa, gerada da mesma forma |
| `PDF_STORAGE_ROOT` | caminho absoluto **fora** da pasta da aplicação (ver seção abaixo), ex: `/home/USUARIO/domains/SEUDOMINIO/edicoes` |
| `UPLOADS_STORAGE_ROOT` | idem, para logo/imagens do admin, ex: `/home/USUARIO/domains/SEUDOMINIO/edicoes/uploads` |
| `APP_CONFIG_ROOT` | idem, para `db-config.json`/`smtp-config.json` salvos via `/admin/configuracoes`, ex: `/home/USUARIO/domains/SEUDOMINIO/edicoes/config` |

**Importante:** gere valores novos e diferentes dos usados em desenvolvimento local. Depois de definidos, não mude `SETTINGS_ENCRYPTION_KEY` — se trocar, a senha do banco salva via `/admin/configuracoes` fica ilegível (você precisaria configurá-la de novo por essa tela).

Essas três variáveis **não estão no repositório** (o `.env` é ignorado de propósito) — precisam ser cadastradas manualmente aqui.

## 5. Rode as migrações no banco de produção

Via SSH (Hostinger Business inclui acesso SSH) ou pelo terminal do hPanel, dentro da pasta da aplicação:

```bash
npx prisma migrate deploy
```

Isso cria as tabelas no banco novo, sem os dados de teste locais — a base sobe zerada.

## 6. Primeiro acesso

1. Acesse `https://seu-dominio.com/admin/setup` e crie o usuário administrador master (essa tela só funciona uma vez).
2. Faça login em `/admin/login`.
3. Cadastre o jornal em **Jornais**, monte a árvore em **Categorias** (ou pule isso e use **Upload em massa**, que cria tudo automaticamente a partir da estrutura de pastas).
4. Envie os PDFs reais pelo admin (**Edições** para um de cada vez, ou **Upload em massa** para uma pasta inteira).

## O que NÃO precisa subir manualmente

- `node_modules`, `.next` — gerados no servidor pelo próprio deploy.
- `src/generated/prisma` — gerado pelo `postinstall` (`prisma generate`).
- `public/pdf.worker.min.mjs` — copiado pelo `postinstall`.
- `.env` — variáveis vão direto no painel da Hostinger (passo 4).
- `config/db-config.json` — não existe ainda em produção; só passa a existir se você usar a tela `/admin/configuracoes` para trocar a conexão depois.
- PDFs (`storage/pdfs/`) — não ficam no Git; sobem via admin (passo 6.4), diretamente para o servidor.

## Por que `PDF_STORAGE_ROOT` / `UPLOADS_STORAGE_ROOT` / `APP_CONFIG_ROOT` são obrigatórias

O deploy via Git do hPanel constrói cada versão nova em uma pasta separada (`.builds/<hash>`) e depois troca a pasta da aplicação por essa versão — não é um `git pull` incremental por cima da pasta existente. Isso significa que **qualquer arquivo que exista só dentro da pasta da aplicação (`process.cwd()`), mesmo gitignorado, não sobrevive a um redeploy**, porque a versão nova nunca copia nada da antiga.

Por isso PDFs, imagens enviadas pelo admin e as configurações salvas em `/admin/configuracoes` precisam morar **fora** dessa árvore, num caminho absoluto fixo (uma pasta irmã de `nodejs/`, criada uma vez pelo Gerenciador de Arquivos do hPanel) — configurado pelas três variáveis de ambiente acima. Sem elas, o app usa uma pasta local dentro de `process.cwd()` como fallback (bom para desenvolvimento local, mas **seria apagado no próximo redeploy em produção**).

Confirmado em produção: essas pastas sobrevivem normalmente a um "Reimplantar" comum, mas um ciclo completo de Parar → Iniciar força a reconstrução do zero — por isso vale sempre confirmar esses caminhos antes de fazer isso.
