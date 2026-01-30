// Auto-enroll ben@justfeatured.com in ALL courses
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

// Ben's email - automatically gets access to everything
const BEN_EMAIL = 'ben@justfeatured.com';

async function autoEnrollBen() {
    console.log('Auto-enrolling ben@justfeatured.com in all courses...\n');

    try {
        // Get ben's user ID
        const users = await sql`SELECT id FROM users WHERE email = ${BEN_EMAIL}`;

        if (users.length === 0) {
            console.log('User not found! Creating...');
            // This shouldn't happen but create user if needed
            return;
        }

        const benUserId = users[0].id;
        console.log('Ben user ID:', benUserId);

        // Get all courses
        const courses = await sql`SELECT id, title FROM courses`;
        console.log(`Found ${courses.length} courses\n`);

        // Enroll ben in each course
        for (const course of courses) {
            // Check if already enrolled
            const existing = await sql`
                SELECT id FROM enrollments
                WHERE user_id = ${benUserId}::uuid
                AND course_id = ${course.id}
            `;

            if (existing.length === 0) {
                await sql`
                    INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at)
                    VALUES (gen_random_uuid(), ${benUserId}::uuid, ${course.id}, 'active', NOW())
                `;
                console.log(`✓ Enrolled in: ${course.title}`);
            } else {
                // Make sure status is active
                await sql`
                    UPDATE enrollments SET status = 'active'
                    WHERE user_id = ${benUserId}::uuid AND course_id = ${course.id}
                `;
                console.log(`✓ Already enrolled: ${course.title}`);
            }
        }

        console.log('\n✅ Ben is now enrolled in all courses!');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Export for use in other modules
module.exports = { autoEnrollBen, BEN_EMAIL };

// Run if called directly
if (require.main === module) {
    autoEnrollBen();
}
