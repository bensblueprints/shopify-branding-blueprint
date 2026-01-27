const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateAdminSession(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const sessionToken = authHeader.replace('Bearer ', '');

    const { data: session } = await supabase
        .from('sessions')
        .select('*, admin_users(*)')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .not('admin_id', 'is', null)
        .single();

    return session?.admin_users || null;
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
        const [
            { count: totalUsers },
            { count: totalCourses },
            { count: totalLessons },
            { count: totalPurchases },
            { data: recentPurchases },
            { data: recentUsers }
        ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('courses').select('*', { count: 'exact', head: true }),
            supabase.from('lessons').select('*', { count: 'exact', head: true }),
            supabase.from('purchases').select('*', { count: 'exact', head: true }),
            supabase
                .from('purchases')
                .select('*, users(email, full_name), products(name)')
                .order('purchased_at', { ascending: false })
                .limit(5),
            supabase
                .from('users')
                .select('id, email, full_name, created_at')
                .order('created_at', { ascending: false })
                .limit(5)
        ]);

        // Calculate revenue
        const { data: revenueData } = await supabase
            .from('purchases')
            .select('amount_cents')
            .eq('status', 'completed');

        const totalRevenue = (revenueData || []).reduce((sum, p) => sum + p.amount_cents, 0);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                stats: {
                    totalUsers: totalUsers || 0,
                    totalCourses: totalCourses || 0,
                    totalLessons: totalLessons || 0,
                    totalPurchases: totalPurchases || 0,
                    totalRevenue: totalRevenue / 100
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
            body: JSON.stringify({ error: 'Failed to load dashboard' })
        };
    }
};
