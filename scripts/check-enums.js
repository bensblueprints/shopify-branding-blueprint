// Check database enums
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function checkEnums() {
    console.log('Checking database enums...\n');

    try {
        // Get all enum types
        const enums = await sql`
            SELECT t.typname as enum_name, e.enumlabel as enum_value
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            ORDER BY t.typname, e.enumsortorder
        `;

        const grouped = {};
        enums.forEach(e => {
            if (!grouped[e.enum_name]) grouped[e.enum_name] = [];
            grouped[e.enum_name].push(e.enum_value);
        });

        for (const [name, values] of Object.entries(grouped)) {
            console.log(`${name}: ${values.join(', ')}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkEnums();
