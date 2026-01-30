// Create Ben user with correct schema
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function createBenUser() {
    console.log('Creating user...\n');

    try {
        // Check if user exists
        let users = await sql`SELECT * FROM users WHERE email = 'ben@justfeatured.com'`;

        if (users.length === 0) {
            // Create user with correct enum value (OWNER, ADMIN, or STAFF)
            // and UserStatus (ACTIVE, INVITED, DISABLED)
            users = await sql`
                INSERT INTO users (
                    id, email, first_name, last_name, full_name, role, permissions,
                    two_factor_enabled, login_count, status, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid()::text,
                    'ben@justfeatured.com',
                    'Ben',
                    'Featured',
                    'Ben Featured',
                    'OWNER',
                    '{}',
                    false,
                    0,
                    'ACTIVE',
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;
            console.log('✓ User created:', users[0]?.email);
        } else {
            console.log('✓ User already exists:', users[0]?.email);
        }

        // Create admin user
        let admins = await sql`SELECT * FROM admin_users WHERE email = 'ben@justfeatured.com'`;
        if (admins.length === 0) {
            admins = await sql`
                INSERT INTO admin_users (id, email, full_name, role, created_at, updated_at)
                VALUES (gen_random_uuid(), 'ben@justfeatured.com', 'Ben', 'super_admin', NOW(), NOW())
                RETURNING *
            `;
            console.log('✓ Admin user created');
        } else {
            console.log('✓ Admin user already exists');
        }

        // Create customer
        let customers = await sql`SELECT * FROM customers WHERE email = 'ben@justfeatured.com'`;
        if (customers.length === 0) {
            customers = await sql`
                INSERT INTO customers (
                    id, email, first_name, last_name, accepts_marketing,
                    marketing_opt_in_level, state, tax_exempt, verified_email,
                    total_spent, orders_count, created_at, updated_at
                )
                VALUES (
                    gen_random_uuid()::text,
                    'ben@justfeatured.com',
                    'Ben',
                    'Featured',
                    false,
                    'SINGLE_OPT_IN',
                    'ENABLED',
                    false,
                    true,
                    0,
                    0,
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;
            console.log('✓ Customer created');
        } else {
            console.log('✓ Customer already exists');
        }

        // Check if courses exist
        const courses = await sql`SELECT * FROM courses WHERE slug = 'shopify-branding-blueprint'`;
        if (courses.length > 0 && users.length > 0) {
            // Check enrollment
            let enrollments = await sql`
                SELECT * FROM enrollments WHERE user_id = ${users[0].id}::uuid AND course_id = ${courses[0].id}
            `;
            if (enrollments.length === 0) {
                // Try to create enrollment (might fail if schema is different)
                try {
                    await sql`
                        INSERT INTO enrollments (id, user_id, course_id, status, created_at)
                        VALUES (gen_random_uuid(), ${users[0].id}::uuid, ${courses[0].id}, 'active', NOW())
                    `;
                    console.log('✓ Enrollment created');
                } catch (e) {
                    console.log('Could not create enrollment:', e.message);
                }
            } else {
                console.log('✓ Enrollment already exists');
            }
        }

        console.log('\n✅ Done!');
        console.log('\nLogin credentials:');
        console.log('Portal: ben@justfeatured.com (password set on first login)');
        console.log('Admin: ben@justfeatured.com (password set on first login)');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

createBenUser();
