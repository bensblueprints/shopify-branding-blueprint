// Debug session and user data
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function debug() {
    console.log('Debugging session and user data...\n');

    try {
        // Check users table
        console.log('=== Users Table ===');
        const users = await sql`SELECT id, email FROM users WHERE email = 'ben@justfeatured.com'`;
        console.log('Ben user:', users[0]);
        console.log('User ID type:', typeof users[0]?.id);

        // Check sessions table schema
        console.log('\n=== Sessions Table Schema ===');
        const sessionCols = await sql`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'sessions'
        `;
        sessionCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check users table schema
        console.log('\n=== Users Table Schema (id column) ===');
        const userCols = await sql`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'id'
        `;
        console.log('User id column:', userCols[0]);

        // Check recent sessions
        console.log('\n=== Recent Sessions ===');
        const sessions = await sql`
            SELECT id, user_id, admin_id, expires_at, created_at
            FROM sessions
            ORDER BY created_at DESC
            LIMIT 5
        `;
        sessions.forEach(s => {
            console.log(`  Session: user_id=${s.user_id}, admin_id=${s.admin_id}, expires=${s.expires_at}`);
        });

        // Try the join that's failing
        console.log('\n=== Testing Join ===');
        try {
            const joinResult = await sql`
                SELECT s.*, u.id as user_id, u.email
                FROM sessions s
                JOIN users u ON s.user_id = u.id::text
                WHERE s.user_id IS NOT NULL
                LIMIT 1
            `;
            console.log('Join with ::text cast works:', joinResult.length > 0);
        } catch (e) {
            console.log('Join failed:', e.message);
        }

        // Check enrollments
        console.log('\n=== Enrollments ===');
        const enrollments = await sql`SELECT * FROM enrollments WHERE user_id IS NOT NULL LIMIT 5`;
        console.log('Enrollments:', enrollments.length);
        if (enrollments.length > 0) {
            console.log('Sample enrollment:', enrollments[0]);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

debug();
