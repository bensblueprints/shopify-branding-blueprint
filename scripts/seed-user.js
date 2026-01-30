// Seed user and customer data
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function seedUser() {
    console.log('Seeding user data...\n');

    try {
        // Check if user already exists
        let users = await sql`SELECT * FROM users WHERE email = 'ben@justfeatured.com'`;

        if (users.length === 0) {
            users = await sql`
                INSERT INTO users (id, email, full_name)
                VALUES (gen_random_uuid(), 'ben@justfeatured.com', 'Ben')
                RETURNING *
            `;
        }
        console.log('✓ User created/updated:', users[0]?.email);

        // Check if customer already exists
        let customers = await sql`SELECT * FROM customers WHERE email = 'ben@justfeatured.com'`;

        if (customers.length === 0) {
            customers = await sql`
                INSERT INTO customers (id, email, full_name, payment_provider, products_purchased)
                VALUES (gen_random_uuid(), 'ben@justfeatured.com', 'Ben', 'manual', ARRAY['main_course'])
                RETURNING *
            `;
        }
        console.log('✓ Customer created/updated:', customers[0]?.email);

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
            }
            console.log('✓ Enrollment created/updated');
        }

        console.log('\n✅ User seeding complete!');
        console.log('\nYou can now login with:');
        console.log('Email: ben@justfeatured.com');
        console.log('Password: (any password - it will be set on first login)');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

seedUser();
