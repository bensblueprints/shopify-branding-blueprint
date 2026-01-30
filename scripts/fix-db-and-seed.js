// Fix database constraints and seed user data
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function fixAndSeed() {
    console.log('Fixing database and seeding data...\n');

    try {
        // First, fix the NOT NULL constraints that are causing issues
        console.log('Fixing constraints...');

        // Make password_hash nullable in users table
        await sql`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`;
        console.log('✓ users.password_hash is now nullable');

        // Make password_hash nullable in admin_users table
        await sql`ALTER TABLE admin_users ALTER COLUMN password_hash DROP NOT NULL`;
        console.log('✓ admin_users.password_hash is now nullable');

    } catch (e) {
        console.log('Note: Constraints may already be correct -', e.message);
    }

    try {
        // Create user
        let users = await sql`SELECT * FROM users WHERE email = 'ben@justfeatured.com'`;

        if (users.length === 0) {
            users = await sql`
                INSERT INTO users (id, email, full_name)
                VALUES (gen_random_uuid(), 'ben@justfeatured.com', 'Ben')
                RETURNING *
            `;
            console.log('✓ User created:', users[0]?.email);
        } else {
            console.log('✓ User already exists:', users[0]?.email);
        }

        // Create customer
        let customers = await sql`SELECT * FROM customers WHERE email = 'ben@justfeatured.com'`;

        if (customers.length === 0) {
            customers = await sql`
                INSERT INTO customers (id, email, full_name, payment_provider, products_purchased)
                VALUES (gen_random_uuid(), 'ben@justfeatured.com', 'Ben', 'manual', ARRAY['main_course'])
                RETURNING *
            `;
            console.log('✓ Customer created:', customers[0]?.email);
        } else {
            console.log('✓ Customer already exists:', customers[0]?.email);
        }

        // Create admin user
        let admins = await sql`SELECT * FROM admin_users WHERE email = 'ben@justfeatured.com'`;

        if (admins.length === 0) {
            admins = await sql`
                INSERT INTO admin_users (id, email, full_name, role)
                VALUES (gen_random_uuid(), 'ben@justfeatured.com', 'Ben', 'super_admin')
                RETURNING *
            `;
            console.log('✓ Admin created:', admins[0]?.email);
        } else {
            console.log('✓ Admin already exists:', admins[0]?.email);
        }

        // Get course ID
        const courses = await sql`SELECT id FROM courses WHERE slug = 'shopify-branding-blueprint'`;

        if (courses.length > 0 && users.length > 0) {
            // Check if enrollment exists
            let enrollments = await sql`
                SELECT * FROM enrollments
                WHERE user_id = ${users[0].id} AND course_id = ${courses[0].id}
            `;

            if (enrollments.length === 0) {
                enrollments = await sql`
                    INSERT INTO enrollments (id, user_id, course_id, status)
                    VALUES (gen_random_uuid(), ${users[0].id}, ${courses[0].id}, 'active')
                    RETURNING *
                `;
                console.log('✓ Enrollment created');
            } else {
                console.log('✓ Enrollment already exists');
            }
        }

        console.log('\n✅ Database fixed and user seeded!');
        console.log('\nYou can now login with:');
        console.log('Email: ben@justfeatured.com');
        console.log('Password: (any password - it will be set on first login)');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fixAndSeed();
