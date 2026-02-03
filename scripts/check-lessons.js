const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function checkAllLessons() {
    const lessons = await sql`
        SELECT l.id, l.title, l.description, l.content,
               LENGTH(l.content) as content_length,
               m.title as module_title,
               m.sort_order as module_order
        FROM lessons l
        JOIN modules m ON l.module_id = m.id
        ORDER BY m.sort_order, l.sort_order
    `;

    console.log("=== ALL LESSONS CONTENT STATUS ===\n");

    let currentModule = "";
    let missingCount = 0;

    for (const l of lessons) {
        if (l.module_title !== currentModule) {
            currentModule = l.module_title;
            console.log("\n📁 " + currentModule);
        }
        const hasContent = l.content && l.content.length > 0;
        const status = hasContent ? "✅" : "❌";
        if (!hasContent) missingCount++;
        console.log("   " + status + " " + l.title + " (" + (l.content_length || 0) + " chars)");
    }

    console.log("\n\nLessons with missing content: " + missingCount);
    console.log("Total lessons: " + lessons.length);
}

checkAllLessons();
