// Admin dashboard with Neon database
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function validateAdminSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    const sessions = await sql`
        SELECT s.*, a.id as admin_id, a.email, a.full_name, a.role
        FROM sessions s
        JOIN admin_users a ON s.admin_id = a.id
        WHERE s.session_token = ${sessionToken}
        AND s.expires_at > NOW()
        AND s.admin_id IS NOT NULL
    `;

    if (sessions.length === 0) return null;
    return sessions[0];
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;
    const admin = await validateAdminSession(authHeader);

    if (!admin) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        // Get counts
        const [userCount] = await sql`SELECT COUNT(*) as count FROM users`;
        const [courseCount] = await sql`SELECT COUNT(*) as count FROM courses`;
        const [lessonCount] = await sql`SELECT COUNT(*) as count FROM lessons`;
        const [purchaseCount] = await sql`SELECT COUNT(*) as count FROM purchases`;

        // Get revenue
        const [revenueData] = await sql`
            SELECT COALESCE(SUM(amount_cents), 0) as total
            FROM purchases
            WHERE status = 'completed'
        `;

        // Recent purchases
        const recentPurchases = await sql`
            SELECT p.*, u.email, u.full_name, pr.name as product_name
            FROM purchases p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN products pr ON p.product_id = pr.id
            ORDER BY p.purchased_at DESC
            LIMIT 5
        `;

        // Recent users
        const recentUsers = await sql`
            SELECT id, email, full_name, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                stats: {
                    totalUsers: parseInt(userCount.count) || 0,
                    totalCourses: parseInt(courseCount.count) || 0,
                    totalLessons: parseInt(lessonCount.count) || 0,
                    totalPurchases: parseInt(purchaseCount.count) || 0,
                    totalRevenue: (parseInt(revenueData.total) || 0) / 100
                },
                recentPurchases: recentPurchases || [],
                recentUsers: recentUsers || []
            })
        };

    } catch (error) {
        console.error('Dashboard error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to load dashboard: ' + error.message })
        };
    }
};
