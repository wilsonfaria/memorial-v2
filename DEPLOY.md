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

## Atenção com a pasta `storage/pdfs`

Ela precisa **persistir entre deploys** (não pode ser apagada a cada `git pull`/redeploy). Deploys via Git normalmente preservam arquivos não versionados na pasta da aplicação, mas confirme esse comportamento com o suporte da Hostinger antes de subir o acervo real — um redeploy que limpe a pasta apagaria os PDFs já enviados (os registros no banco ficariam órfãos, apontando para arquivos inexistentes).
