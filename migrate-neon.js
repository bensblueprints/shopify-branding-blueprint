// Migrate schema to Neon database
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_sK7M4EbyDBiz@ep-aged-river-ah63sktg-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

async function migrate() {
    console.log('Starting migration...');

    // Create tables
    await sql`
        CREATE TABLE IF NOT EXISTS admin_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255),
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'admin',
            is_active BOOLEAN DEFAULT true,
            last_login_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ admin_users table');

    await sql`
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            password_hash VARCHAR(255),
            stripe_customer_id VARCHAR(255),
            airwallex_customer_id VARCHAR(255),
            last_login_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ users table');

    await sql`
        CREATE TABLE IF NOT EXISTS customers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            payment_provider VARCHAR(50),
            payment_id VARCHAR(255),
            order_id VARCHAR(255),
            amount_paid DECIMAL(10,2),
            currency VARCHAR(10) DEFAULT 'USD',
            products_purchased TEXT[] DEFAULT '{}',
            stripe_customer_id VARCHAR(255),
            airwallex_customer_id VARCHAR(255),
            airwallex_payment_consent_id VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ customers table');

    await sql`
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            admin_id UUID,
            session_token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            ip_address VARCHAR(100),
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ sessions table');

    await sql`
        CREATE TABLE IF NOT EXISTS auth_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(255) UNIQUE NOT NULL,
            token_type VARCHAR(50) DEFAULT 'magic_link',
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ auth_tokens table');

    await sql`
        CREATE TABLE IF NOT EXISTS courses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            slug VARCHAR(100) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            subtitle VARCHAR(500),
            description TEXT,
            thumbnail_url TEXT,
            price_cents INTEGER NOT NULL DEFAULT 0,
            is_published BOOLEAN DEFAULT false,
            lesson_count INTEGER DEFAULT 0,
            total_duration_minutes INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ courses table');

    await sql`
        CREATE TABLE IF NOT EXISTS modules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
            slug VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_published BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ modules table');

    await sql`
        CREATE TABLE IF NOT EXISTS lessons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
            slug VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            video_url TEXT,
            video_id VARCHAR(100),
            duration_minutes INTEGER DEFAULT 0,
            content_html TEXT,
            is_preview BOOLEAN DEFAULT false,
            is_published BOOLEAN DEFAULT true,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ lessons table');

    await sql`
        CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_key VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price_cents INTEGER NOT NULL,
            is_recurring BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ products table');

    await sql`
        CREATE TABLE IF NOT EXISTS purchases (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id),
            product_id UUID REFERENCES products(id),
            amount_cents INTEGER NOT NULL,
            currency VARCHAR(10) DEFAULT 'USD',
            status VARCHAR(50) DEFAULT 'completed',
            is_upsell BOOLEAN DEFAULT false,
            purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `;
    console.log('✓ purchases table');

    await sql`
        CREATE TABLE IF NOT EXISTS enrollments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
            status VARCHAR(50) DEFAULT 'active',
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, course_id)
        )
    `;
    console.log('✓ enrollments table');

    await sql`
        CREATE TABLE IF NOT EXISTS lesson_progress (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
            is_completed BOOLEAN DEFAULT false,
            completed_at TIMESTAMP WITH TIME ZONE,
            progress_percent INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, lesson_id)
        )
    `;
    console.log('✓ lesson_progress table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token)`;
    console.log('✓ indexes created');

    // Seed data
    await sql`
        INSERT INTO admin_users (email, full_name, role)
        VALUES ('ben@justfeatured.com', 'Ben', 'super_admin')
        ON CONFLICT (email) DO NOTHING
    `;
    console.log('✓ admin user seeded');

    await sql`
        INSERT INTO users (email, full_name)
        VALUES ('ben@justfeatured.com', 'Ben')
        ON CONFLICT (email) DO NOTHING
    `;
    console.log('✓ user seeded');

    await sql`
        INSERT INTO customers (email, payment_provider, products_purchased)
        VALUES ('ben@justfeatured.com', 'manual', ARRAY['main_course'])
        ON CONFLICT (email) DO NOTHING
    `;
    console.log('✓ customer seeded');

    await sql`
        INSERT INTO products (product_key, name, price_cents)
        VALUES
            ('main_course', '7-Day Shopify Branding Blueprint', 2700),
            ('canva_kit', 'Done-For-You Canva Brand Kit', 2700),
            ('email_swipe', 'Email Sequence Swipe File', 1900),
            ('fb_ads', 'Facebook Ads for Brands Masterclass', 9700),
            ('inner_circle', 'Brand Builders Inner Circle', 4700)
        ON CONFLICT (product_key) DO NOTHING
    `;
    console.log('✓ products seeded');

    await sql`
        INSERT INTO courses (slug, title, subtitle, price_cents, is_published, lesson_count)
        VALUES ('shopify-branding-blueprint', '7-Day Shopify Branding Blueprint', 'Build a 6-7 Figure Brand in Just 7 Days', 2700, true, 30)
        ON CONFLICT (slug) DO NOTHING
    `;
    console.log('✓ course seeded');

    console.log('\n✅ Migration complete!');
}

migrate().catch(console.error);
