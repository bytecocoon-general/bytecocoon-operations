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

## Dados de demonstração

O seed contém dados fictícios para desenvolvimento. Não deve ser executado numa base de dados de produção.

```bash
npm run seed
```
