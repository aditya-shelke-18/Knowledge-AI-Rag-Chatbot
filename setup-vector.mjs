import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

try {
  await sql.unsafe('CREATE EXTENSION IF NOT EXISTS vector');
  console.log('✅ pgvector extension enabled successfully');
} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  await sql.end();
}
