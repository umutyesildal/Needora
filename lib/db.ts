import 'server-only';
import { neon } from '@neondatabase/serverless';

// Tagged template SQL: sql`select * from leads where id = ${id}` returns rows.
export const sql = neon(process.env.DATABASE_URL!);
