// Check and fix user data
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function fixUser() {
    console.log('Checking existing users...\n');

    try {
        // Get all users
        const users = await sql`SELECT id, email, first_name, last_name, full_name, role, status FROM users`;
        console.log('Existing users:');
        users.forEach(u => {
            console.log(`  - ${u.email} (${u.first_name} ${u.last_name}) role: ${u.role} status: ${u.status}`);
        });

        // Check if ben@justfeatured.com exists
        const benUser = await sql`SELECT * FROM users WHERE email = 'ben@justfeatured.com'`;
        if (benUser.length > 0) {
            console.log('\nUser ben@justfeatured.com already exists!');
            console.log('ID:', benUser[0].id);
            console.log('Password hash set:', !!benUser[0].password_hash);
        } else {
            console.log('\nCreating user ben@justfeatured.com...');
            // Insert with the correct schema
            const newUser = await sql`
                INSERT INTO users (
                    id, email, first_name, last_name, full_name, role, permissions,
                    two_factor_enabled, login_count, status, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid()::text, 'ben@justfeatured.com', 'Ben', 'Featured', 'Ben Featured',
                    'admin', '{}', false, 0, 'active', NOW(), NOW()
                )
                RETURNING *
            `;
            console.log('Created user:', newUser[0]?.email);
        }

        // Check admin_users
        console.log('\nChecking admin users...');
        const admins = await sql`SELECT * FROM admin_users`;
        console.log('Admin users:', admins.length);
        admins.forEach(a => {
            console.log(`  - ${a.email} (${a.full_name}) role: ${a.role}`);
        });

        // Check if ben exists in admin_users
        const benAdmin = await sql`SELECT * FROM admin_users WHERE email = 'ben@justfeatured.com'`;
        if (benAdmin.length === 0) {
            console.log('\nCreating admin user...');
            await sql`
                INSERT INTO admin_users (id, email, full_name, role, created_at, updated_at)
                VALUES (gen_random_uuid(), 'ben@justfeatured.com', 'Ben', 'super_admin', NOW(), NOW())
            `;
            console.log('Created admin user');
        } else {
            console.log('\nAdmin user already exists');
        }

        // Check enrollments
        const courses = await sql`SELECT * FROM courses WHERE slug = 'shopify-branding-blueprint'`;
        console.log('\nCourses:', courses.length);

        console.log('\n✅ Done checking!');
        console.log('\nTo login, use: ben@justfeatured.com');
        console.log('Password will be set on first login.');

    } catch (error) {
        console.error('Error:', error);
    }
}

fixUser();
