# Cocoon Ops

Plataforma interna de controlo operacional e financeiro para equipas que trabalham por projecto.

Centraliza colaboradores, clientes, projectos, alocações, timesheets, despesas, payroll e facturação. O objectivo é acompanhar de onde vem o dinheiro, onde é gasto e antecipar receita, custos, margem e fim de alocações.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL
- Conta Clerk para autenticação

## Configuração local

1. Instalar as dependências:

   ```bash
   npm ci
   ```

2. Criar o ficheiro de ambiente:

   ```bash
   cp .env.example .env.local
   ```

3. Preencher as variáveis em `.env.local`.

4. Preparar a base de dados:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

5. Iniciar o servidor:

   ```bash
   npm run dev
   ```

A aplicação fica disponível em [http://localhost:3000](http://localhost:3000).

## Verificação

Antes de publicar alterações:

```bash
npm run build
```

## Ambientes online

- `develop` publica no ambiente Railway `development`.
- `main` publica no ambiente Railway `production`.

Cada ambiente tem uma base PostgreSQL e credenciais Clerk próprias. As migrations
são executadas antes do arranque através da configuração em `railway.json`.

### Registo por convite

No Clerk, activar `Restrictions → Restricted mode`. Configurar também o webhook
`/api/webhooks/clerk` para o evento `user.created` e guardar o respetivo signing
secret em `CLERK_WEBHOOK_SECRET`. Cada ambiente deve definir `APP_URL` com o seu
URL público. A aplicação limita os convites a uma hora e mantém novos registos
pendentes até aprovação por um administrador.

## Dados de demonstração

O seed contém dados fictícios para desenvolvimento. Não deve ser executado numa base de dados de produção.

```bash
npm run seed
```
