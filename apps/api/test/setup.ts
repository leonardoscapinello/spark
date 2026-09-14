import "dotenv/config"; // loads apps/api/.env — SUPABASE_JWT_SECRET (and the app's DATABASE_URL)

// Testes de infraestrutura só são coletados com uma URL isolada explícita.
// Nunca caem no único banco persistente do app por fallback.
if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for infrastructure tests.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
