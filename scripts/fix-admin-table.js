// Fix admin_users table schema
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function fixAdminTable() {
    console.log('Fixing admin_users table...\n');

    try {
        // Check current columns
        const columns = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'admin_users'
        `;
        console.log('Current columns:', columns.map(c => c.column_name).join(', '));

        const existingCols = columns.map(c => c.column_name);

        // Add is_active column if missing
        if (!existingCols.includes('is_active')) {
            await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;
            console.log('✓ Added is_active column');

            // Set all existing admins to active
            await sql`UPDATE admin_users SET is_active = true WHERE is_active IS NULL`;
            console.log('✓ Set all admins to active');
        }

        // Add last_login_at column if missing
        if (!existingCols.includes('last_login_at')) {
            await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE`;
            console.log('✓ Added last_login_at column');
        }

        console.log('\n✅ Admin_users table fixed!');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fixAdminTable();
