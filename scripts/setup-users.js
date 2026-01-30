// Setup users with passwords
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function setupUsers() {
    console.log('Setting up users...\n');

    const password = 'JEsus777$$!';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    try {
        // ============================================
        // 1. Setup ben@justfeatured.com (Portal User)
        // ============================================
        console.log('\n=== Setting up ben@justfeatured.com ===');

        // Check if user exists
        let users = await sql`SELECT * FROM users WHERE email = 'ben@justfeatured.com'`;

        if (users.length === 0) {
            // Create user with correct schema
            users = await sql`
                INSERT INTO users (
                    id, email, first_name, last_name, full_name, role, permissions,
                    two_factor_enabled, login_count, status, password_hash, created_at, updated_at
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
                    ${hashedPassword},
                    NOW(),
                    NOW()
                )
                RETURNING *
            `;
            console.log('✓ User created with password');
        } else {
            // Update password
            await sql`
                UPDATE users
                SET password_hash = ${hashedPassword}, updated_at = NOW()
                WHERE email = 'ben@justfeatured.com'
            `;
            console.log('✓ User password updated');
        }

        // Also update admin_users table for ben
        let benAdmin = await sql`SELECT * FROM admin_users WHERE email = 'ben@justfeatured.com'`;
        if (benAdmin.length === 0) {
            await sql`
                INSERT INTO admin_users (id, email, full_name, role, password_hash, created_at, updated_at)
                VALUES (gen_random_uuid(), 'ben@justfeatured.com', 'Ben', 'super_admin', ${hashedPassword}, NOW(), NOW())
            `;
            console.log('✓ Ben admin user created');
        } else {
            await sql`
                UPDATE admin_users
                SET password_hash = ${hashedPassword}, updated_at = NOW()
                WHERE email = 'ben@justfeatured.com'
            `;
            console.log('✓ Ben admin password updated');
        }

        // ============================================
        // 2. Setup admin@advancedmarketing.co (Admin)
        // ============================================
        console.log('\n=== Setting up admin@advancedmarketing.co ===');

        let admins = await sql`SELECT * FROM admin_users WHERE email = 'admin@advancedmarketing.co'`;

        if (admins.length === 0) {
            await sql`
                INSERT INTO admin_users (id, email, full_name, role, password_hash, created_at, updated_at)
                VALUES (gen_random_uuid(), 'admin@advancedmarketing.co', 'Admin', 'super_admin', ${hashedPassword}, NOW(), NOW())
            `;
            console.log('✓ Admin user created with password');
        } else {
            await sql`
                UPDATE admin_users
                SET password_hash = ${hashedPassword}, updated_at = NOW()
                WHERE email = 'admin@advancedmarketing.co'
            `;
            console.log('✓ Admin password updated');
        }

        // ============================================
        // 3. Ensure ben has course enrollment
        // ============================================
        console.log('\n=== Setting up course access ===');

        // Get all courses
        const courses = await sql`SELECT id, title FROM courses`;
        console.log(`Found ${courses.length} courses`);

        // Get ben's user ID
        const benUser = await sql`SELECT id FROM users WHERE email = 'ben@justfeatured.com'`;

        if (benUser.length > 0 && courses.length > 0) {
            for (const course of courses) {
                try {
                    // Check if enrollment exists
                    const existing = await sql`
                        SELECT * FROM enrollments
                        WHERE user_id = ${benUser[0].id}::uuid AND course_id = ${course.id}
                    `;

                    if (existing.length === 0) {
                        await sql`
                            INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at)
                            VALUES (gen_random_uuid(), ${benUser[0].id}::uuid, ${course.id}, 'active', NOW())
                        `;
                        console.log(`✓ Enrolled in: ${course.title}`);
                    } else {
                        console.log(`✓ Already enrolled in: ${course.title}`);
                    }
                } catch (e) {
                    console.log(`Could not enroll in ${course.title}: ${e.message}`);
                }
            }
        }

        // ============================================
        // 4. Grant all product access
        // ============================================
        console.log('\n=== Setting up product access ===');

        const products = await sql`SELECT id, name, product_key FROM products`;
        console.log(`Found ${products.length} products`);

        // Update customer with all products
        await sql`
            UPDATE customers
            SET products_purchased = ARRAY['main_course', 'canva_kit', 'email_swipe', 'seo_checklist', 'fb_ads', 'inner_circle']
            WHERE email = 'ben@justfeatured.com'
        `;
        console.log('✓ All products granted to ben');

        console.log('\n✅ Setup complete!');
        console.log('\n=== Login Credentials ===');
        console.log('Portal Login:');
        console.log('  Email: ben@justfeatured.com');
        console.log('  Password: JEsus777$$!');
        console.log('\nAdmin Login:');
        console.log('  Email: admin@advancedmarketing.co');
        console.log('  Password: JEsus777$$!');
        console.log('\n  (ben@justfeatured.com also has admin access)');

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    }
}

setupUsers();
