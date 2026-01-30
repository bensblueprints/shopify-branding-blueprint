// Fix sessions table schema
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function fixSessionsTable() {
    console.log('Fixing sessions table...\n');

    try {
        // Check current columns
        const columns = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'sessions'
        `;
        console.log('Current columns:', columns.map(c => c.column_name).join(', '));

        // Add missing columns if needed
        const existingCols = columns.map(c => c.column_name);

        if (!existingCols.includes('ip_address')) {
            await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100)`;
            console.log('✓ Added ip_address column');
        }

        if (!existingCols.includes('user_agent')) {
            await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT`;
            console.log('✓ Added user_agent column');
        }

        console.log('\n✅ Sessions table fixed!');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fixSessionsTable();
