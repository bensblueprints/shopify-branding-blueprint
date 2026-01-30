// Check actual database schema
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function checkSchema() {
    console.log('Checking database schema...\n');

    try {
        // Get users table columns
        const usersColumns = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `;
        console.log('USERS table columns:');
        usersColumns.forEach(c => {
            console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
        });

        // Get admin_users table columns
        const adminColumns = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'admin_users'
            ORDER BY ordinal_position
        `;
        console.log('\nADMIN_USERS table columns:');
        adminColumns.forEach(c => {
            console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
        });

        // Get customers table columns
        const customersColumns = await sql`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'customers'
            ORDER BY ordinal_position
        `;
        console.log('\nCUSTOMERS table columns:');
        customersColumns.forEach(c => {
            console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
        });

        // Check existing users
        const users = await sql`SELECT * FROM users LIMIT 5`;
        console.log('\nExisting users:', users.length);
        if (users.length > 0) {
            console.log('  Sample:', Object.keys(users[0]));
        }

        // Check existing customers
        const customers = await sql`SELECT * FROM customers LIMIT 5`;
        console.log('\nExisting customers:', customers.length);
        if (customers.length > 0) {
            console.log('  Sample:', Object.keys(customers[0]));
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSchema();
