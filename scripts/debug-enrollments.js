// Debug enrollment data and types
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function debug() {
    console.log('Debugging enrollment data...\n');

    try {
        // Check enrollments table schema
        console.log('=== Enrollments Table Schema ===');
        const cols = await sql`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'enrollments'
        `;
        cols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check ben's enrollment
        console.log('\n=== Ben Enrollments ===');
        const benUser = await sql`SELECT id FROM users WHERE email = 'ben@justfeatured.com'`;
        console.log('Ben user ID:', benUser[0]?.id);

        const enrollments = await sql`
            SELECT * FROM enrollments
            WHERE user_id = ${benUser[0]?.id}
        `;
        console.log('Enrollments found:', enrollments.length);
        enrollments.forEach(e => console.log('  ', e));

        // Try the exact query from portal-courses
        console.log('\n=== Testing portal-courses query ===');
        try {
            const results = await sql`
                SELECT e.*, c.id as course_id, c.slug, c.title, c.subtitle,
                       c.thumbnail_url, c.lesson_count, c.total_duration_minutes
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                WHERE e.user_id = ${benUser[0]?.id}
                AND e.status = 'active'
            `;
            console.log('Query works! Results:', results.length);
            results.forEach(r => console.log('  Course:', r.title));
        } catch (e) {
            console.log('Query failed:', e.message);
        }

        // Check courses table schema
        console.log('\n=== Courses Table Schema (relevant cols) ===');
        const courseCols = await sql`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'courses'
            AND column_name IN ('id', 'lesson_count', 'total_duration_minutes', 'thumbnail_url')
        `;
        courseCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

        // Check if courses have these columns
        console.log('\n=== Sample Course ===');
        const courses = await sql`SELECT * FROM courses LIMIT 1`;
        if (courses.length > 0) {
            console.log('Course columns:', Object.keys(courses[0]).join(', '));
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
    }
}

debug();
