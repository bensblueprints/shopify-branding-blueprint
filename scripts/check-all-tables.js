// Check all table schemas
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function checkTables() {
    const tables = ['courses', 'modules', 'lessons', 'enrollments', 'lesson_progress', 'products', 'purchases'];

    for (const table of tables) {
        console.log(`\n=== ${table.toUpperCase()} ===`);
        try {
            const cols = await sql`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = ${table}
                ORDER BY ordinal_position
            `;
            if (cols.length === 0) {
                console.log('  Table does not exist or has no columns');
            } else {
                cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (${c.is_nullable === 'YES' ? 'nullable' : 'required'})`));
            }
        } catch (e) {
            console.log('  Error:', e.message);
        }
    }
}

checkTables();
