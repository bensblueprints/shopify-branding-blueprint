-- =============================================
-- SUPABASE DATABASE SCHEMA
-- Shopify Branding Blueprint Course Platform
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ADMIN USERS TABLE
-- Separate from customers, for course management
-- =============================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USERS (CUSTOMERS) TABLE
-- Customers who purchased courses
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    ghl_contact_id VARCHAR(255),
    avatar_url TEXT,
    auth_provider VARCHAR(50) DEFAULT 'magic_link',
    password_hash VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- COURSES TABLE
-- =============================================
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    description TEXT,
    thumbnail_url TEXT,
    instructor_name VARCHAR(255),
    instructor_bio TEXT,
    instructor_avatar_url TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0,
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    total_duration_minutes INTEGER DEFAULT 0,
    lesson_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- MODULES TABLE (Days/Sections within a course)
-- =============================================
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, slug)
);

-- =============================================
-- LESSONS TABLE
-- =============================================
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    video_provider VARCHAR(50) DEFAULT 'youtube',
    video_id VARCHAR(100),
    duration_minutes INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    content_html TEXT,
    resources JSONB DEFAULT '[]',
    is_preview BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(module_id, slug)
);

-- =============================================
-- PRODUCTS TABLE
-- Purchasable items (courses, upsells, bundles)
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    compare_price_cents INTEGER,
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    product_type VARCHAR(50) NOT NULL DEFAULT 'course',
    is_recurring BOOLEAN DEFAULT false,
    recurring_interval VARCHAR(20),
    course_ids UUID[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PURCHASES TABLE
-- Records of all purchases
-- =============================================
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    stripe_payment_intent_id VARCHAR(255),
    stripe_checkout_session_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    is_upsell BOOLEAN DEFAULT false,
    source VARCHAR(50) DEFAULT 'checkout',
    metadata JSONB DEFAULT '{}',
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ENROLLMENTS TABLE
-- User access to courses
-- =============================================
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES purchases(id),
    status VARCHAR(50) DEFAULT 'active',
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- =============================================
-- PROGRESS TABLE
-- Lesson completion tracking
-- =============================================
CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    watch_time_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_position_seconds INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- =============================================
-- AUTH TOKENS TABLE
-- For magic link authentication
-- =============================================
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SESSIONS TABLE
-- For session management
-- =============================================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_stripe_session ON purchases(stripe_checkout_session_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_sessions_token ON sessions(session_token);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update course stats
CREATE OR REPLACE FUNCTION update_course_stats(p_course_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE courses
    SET
        lesson_count = (
            SELECT COUNT(*) FROM lessons l
            JOIN modules m ON l.module_id = m.id
            WHERE m.course_id = p_course_id AND l.is_published = true
        ),
        total_duration_minutes = (
            SELECT COALESCE(SUM(l.duration_minutes), 0) FROM lessons l
            JOIN modules m ON l.module_id = m.id
            WHERE m.course_id = p_course_id AND l.is_published = true
        ),
        updated_at = NOW()
    WHERE id = p_course_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update course stats when lessons change
CREATE OR REPLACE FUNCTION trigger_update_course_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_course_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT course_id INTO v_course_id FROM modules WHERE id = OLD.module_id;
    ELSE
        SELECT course_id INTO v_course_id FROM modules WHERE id = NEW.module_id;
    END IF;

    PERFORM update_course_stats(v_course_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lessons_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON lessons
FOR EACH ROW EXECUTE FUNCTION trigger_update_course_stats();

-- Function to calculate user progress for a course
CREATE OR REPLACE FUNCTION get_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS TABLE (
    total_lessons INTEGER,
    completed_lessons INTEGER,
    progress_percent INTEGER,
    total_watch_time_minutes INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(l.id)::INTEGER as total_lessons,
        COUNT(lp.id) FILTER (WHERE lp.is_completed = true)::INTEGER as completed_lessons,
        CASE
            WHEN COUNT(l.id) = 0 THEN 0
            ELSE (COUNT(lp.id) FILTER (WHERE lp.is_completed = true) * 100 / COUNT(l.id))::INTEGER
        END as progress_percent,
        (COALESCE(SUM(lp.watch_time_seconds), 0) / 60)::INTEGER as total_watch_time_minutes
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = p_user_id
    WHERE m.course_id = p_course_id AND l.is_published = true;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SEED DATA: Products
-- =============================================
INSERT INTO products (product_key, name, description, price_cents, compare_price_cents, product_type, is_recurring, metadata) VALUES
('main_course', '7-Day Shopify Branding Blueprint', 'Complete 7-day system for building a 6-7 figure Shopify brand', 2700, 9700, 'course', false, '{"ghl_tag": "purchased_main_course"}'),
('canva_kit', 'Done-For-You Canva Brand Kit', '50+ premium templates ready to customize', 2700, 9700, 'digital_product', false, '{"ghl_tag": "purchased_canva_kit"}'),
('email_swipe', 'Email Sequence Swipe File', 'Copy-paste email sequences that convert at 35%+', 1900, 6700, 'digital_product', false, '{"ghl_tag": "purchased_email_swipe"}'),
('fb_ads', 'Facebook Ads for Brands Masterclass', 'Ad strategies for brand-building', 9700, 29700, 'course', false, '{"ghl_tag": "purchased_fb_ads"}'),
('inner_circle', 'Brand Builders Inner Circle', 'Monthly coaching and community access', 4700, 9700, 'subscription', true, '{"ghl_tag": "purchased_inner_circle", "recurring_interval": "month"}');

-- =============================================
-- SEED DATA: Admin User
-- Password will be set on first login
-- =============================================
INSERT INTO admin_users (email, full_name, role) VALUES
('admin@advancedmarketingco', 'Admin', 'super_admin');

-- =============================================
-- SEED DATA: Main Course
-- =============================================
INSERT INTO courses (slug, title, subtitle, description, instructor_name, price_cents, is_published, is_featured) VALUES
('shopify-branding-blueprint', '7-Day Shopify Branding Blueprint', 'Build a 6-7 Figure Brand in Just 7 Days', 'The complete system for transforming a generic dropshipping store into a premium brand that customers love and competitors can''t copy.', 'Advanced Marketing Co', 2700, true, true);

-- Get the course ID for modules
DO $$
DECLARE
    course_uuid UUID;
    day1_uuid UUID;
    day2_uuid UUID;
    day3_uuid UUID;
    day4_uuid UUID;
    day5_uuid UUID;
    day6_uuid UUID;
    day7_uuid UUID;
BEGIN
    SELECT id INTO course_uuid FROM courses WHERE slug = 'shopify-branding-blueprint';

    -- Insert modules (days)
    INSERT INTO modules (course_id, slug, title, description, sort_order) VALUES
    (course_uuid, 'day-1', 'Day 1: What Is a Brand?', 'The brutal truth about dropshipping & why brands always win', 1) RETURNING id INTO day1_uuid;

    INSERT INTO modules (course_id, slug, title, description, sort_order) VALUES
    (course_uuid, 'day-2', 'Day 2: What It Means to Own a Brand', 'The asset mindset & owning vs. renting your business', 2) RETURNING id INTO day2_uuid;

    INSERT INTO modules (course_id, slug, title, description, sort_order) VALUES
    (course_uuid, 'day-3', 'Day 3: Create Perfect Branding', 'Logo, colors, fonts, voice, story - your complete brand identity', 3) RETURNING id INTO day3_uuid;

    INSERT INTO modules (course_id, slug, title, description, sort_order) VALUES
    (course_uuid, 'day-4', 'Day 4: Find Products & Suppliers', 'Product selection framework & building supplier relationships', 4) RETURNING id INTO day4_uuid;

    INSERT INTO modules (course_id, slug, title, description, sort_order) VALUES
    (course_uuid, 'day-5', 'Day 5: Get Products Customized', 'POD, private label, Alibaba deep dive & packaging design', 5) RETURNING id INTO day5_uuid;

    INSERT INTO modules (course_id, slug, title, description, sort_order) VALUES
    (course_uuid, 'day-6', 'Day 6: 3 Profitable Industries', 'Complete roadmaps for Clothing, Coffee & Supplements brands', 6) RETURNING id INTO day6_uuid;

    INSERT INTO modules (course_id, slug, title, description, sort_order) VALUES
    (course_uuid, 'day-7', 'Day 7: Launch Your Brand', 'Pre-launch checklist, launch strategies & 30-day game plan', 7) RETURNING id INTO day7_uuid;

    -- Day 1 Lessons
    INSERT INTO lessons (module_id, slug, title, description, duration_minutes, sort_order) VALUES
    (day1_uuid, 'welcome', 'Welcome & Course Overview', 'Introduction to the course, what you''ll learn, and how to get the most out of the next 7 days.', 8, 1),
    (day1_uuid, 'dropshipping-illusion', 'The Dropshipping Illusion', 'Why 95% of dropshippers fail and the fundamental flaw in the "winning product" model.', 12, 2),
    (day1_uuid, 'brand-definition', 'What Is a Brand, Really?', 'Understanding what separates a forgettable store from a memorable brand.', 15, 3),
    (day1_uuid, 'brand-advantage', 'The Brand Advantage', 'The compounding benefits of building a brand vs chasing products.', 10, 4);

    -- Day 2 Lessons
    INSERT INTO lessons (module_id, slug, title, description, duration_minutes, sort_order) VALUES
    (day2_uuid, 'owner-mindset', 'The Owner vs Operator Mindset', 'Shifting from "business operator" to "business owner" thinking.', 12, 1),
    (day2_uuid, 'building-asset', 'Building an Asset vs Renting One', 'Understanding the difference between building equity and generating income.', 14, 2),
    (day2_uuid, 'brand-equity', 'The Brand Equity Formula', 'How brand equity compounds over time and increases your business value.', 15, 3),
    (day2_uuid, 'brand-vision', 'Your Brand Vision Exercise', 'Defining your 3-year brand vision and reverse-engineering the path.', 9, 4);

    -- Day 3 Lessons
    INSERT INTO lessons (module_id, slug, title, description, duration_minutes, sort_order) VALUES
    (day3_uuid, 'brand-positioning', 'Brand Positioning & Differentiation', 'Finding your unique position in the market that makes competition irrelevant.', 14, 1),
    (day3_uuid, 'brand-story', 'Crafting Your Brand Story', 'Creating a compelling origin story that connects emotionally with customers.', 12, 2),
    (day3_uuid, 'brand-voice', 'Defining Your Brand Voice', 'Developing a consistent brand voice that resonates with your target audience.', 10, 3),
    (day3_uuid, 'logo-design', 'Visual Identity - Logo Design', 'Creating or sourcing a professional logo that represents your brand.', 15, 4),
    (day3_uuid, 'colors-typography', 'Visual Identity - Colors & Typography', 'Choosing brand colors and fonts that create recognition and convey your positioning.', 14, 5);

    -- Day 4 Lessons
    INSERT INTO lessons (module_id, slug, title, description, duration_minutes, sort_order) VALUES
    (day4_uuid, 'product-framework', 'The Brand-First Product Framework', 'Selecting products that fit your brand vs finding products then building a brand around them.', 14, 1),
    (day4_uuid, 'product-research', 'Product Research Deep Dive', 'Advanced product research techniques for brand builders.', 16, 2),
    (day4_uuid, 'finding-suppliers', 'Finding Quality Suppliers', 'Sourcing reliable suppliers who can grow with your brand.', 15, 3),
    (day4_uuid, 'supplier-relationships', 'Building Supplier Relationships', 'Negotiation strategies and building long-term supplier partnerships.', 10, 4);

    -- Day 5 Lessons
    INSERT INTO lessons (module_id, slug, title, description, duration_minutes, sort_order) VALUES
    (day5_uuid, 'customization-overview', 'Customization Strategy Overview', 'Understanding your customization options and choosing the right approach for your stage.', 10, 1),
    (day5_uuid, 'pod-branding', 'Print-on-Demand for Brand Builders', 'Using POD strategically to test designs and build brand recognition with minimal risk.', 14, 2),
    (day5_uuid, 'private-label', 'Private Label Deep Dive', 'Complete guide to creating private label products with your branding.', 18, 3),
    (day5_uuid, 'alibaba-masterclass', 'Alibaba Masterclass', 'Advanced Alibaba sourcing and customization techniques.', 16, 4),
    (day5_uuid, 'packaging-design', 'Packaging Design for Brands', 'Creating memorable unboxing experiences that reinforce your brand.', 12, 5);

    -- Day 6 Lessons
    INSERT INTO lessons (module_id, slug, title, description, duration_minutes, sort_order) VALUES
    (day6_uuid, 'industry-selection', 'Industry Selection Framework', 'How to evaluate industries and choose one aligned with your goals and resources.', 10, 1),
    (day6_uuid, 'clothing-roadmap', 'Clothing Brand Roadmap', 'Step-by-step guide to launching a clothing brand.', 20, 2),
    (day6_uuid, 'coffee-roadmap', 'Coffee Brand Roadmap', 'Complete guide to starting a coffee brand from scratch.', 20, 3),
    (day6_uuid, 'supplements-roadmap', 'Supplements Brand Roadmap', 'Navigating the supplements industry - regulations, manufacturing, and marketing.', 25, 4);

    -- Day 7 Lessons
    INSERT INTO lessons (module_id, slug, title, description, duration_minutes, sort_order) VALUES
    (day7_uuid, 'pre-launch-checklist', 'Pre-Launch Checklist', 'Everything you need in place before announcing your brand.', 12, 1),
    (day7_uuid, 'launch-strategies', 'Launch Strategy Options', 'Different launch approaches and choosing the right one for your brand.', 15, 2),
    (day7_uuid, '30-day-plan', 'Your 30-Day Launch Plan', 'Day-by-day action plan for your first month as a brand owner.', 18, 3),
    (day7_uuid, 'conclusion', 'What Comes Next & Course Conclusion', 'Your roadmap beyond the 7 days and how to continue growing.', 10, 4);

    -- Update course stats
    PERFORM update_course_stats(course_uuid);

    -- Link main_course product to the course
    UPDATE products SET course_ids = ARRAY[course_uuid] WHERE product_key = 'main_course';
END $$;
