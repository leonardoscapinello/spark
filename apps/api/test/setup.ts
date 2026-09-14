import "dotenv/config"; // loads apps/api/.env — SUPABASE_JWT_SECRET (and the app's DATABASE_URL)

// Testes NUNCA rodam no banco do app. O .env acima traz a DATABASE_URL real
// (o Postgres do projeto Supabase — docs/operacao/ambientes.md); os e2e sobem
// a API dentro do processo e ela lê process.env.DATABASE_URL — então a
// substituímos aqui pela do banco de teste antes de qualquer módulo da API
// carregar. Os fixtures criam e apagam organizações; isso só pode acontecer
// no Docker local ou no Postgres do CI.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:spark_dev@localhost:5432/spark";
