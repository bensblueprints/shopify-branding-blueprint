/**
 * USER PROTECTION UTILITY
 * =======================
 *
 * CRITICAL: This file contains safeguards to prevent accidental or
 * programmatic deletion of users from the database.
 *
 * Users can ONLY be deleted manually from the admin dashboard by Ben.
 * No automated process, webhook, or API should ever delete a user.
 *
 * If you need to remove a user's access, use SOFT DELETE methods:
 * - Set status to 'DISABLED'
 * - Revoke enrollments
 * - Clear sessions
 *
 * NEVER DELETE USER RECORDS PROGRAMMATICALLY.
 */

const PROTECTED_TABLES = ['users', 'customers', 'admin_users'];

/**
 * Validates that a SQL query does not contain user deletion commands
 * @param {string} query - The SQL query to validate
 * @returns {boolean} - True if query is safe, false if it attempts deletion
 */
function isQuerySafe(query) {
    if (!query || typeof query !== 'string') return true;

    const normalizedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();

    // Check for DELETE statements on protected tables
    for (const table of PROTECTED_TABLES) {
        if (normalizedQuery.includes(`delete from ${table}`) ||
            normalizedQuery.includes(`delete from "${table}"`) ||
            normalizedQuery.includes(`truncate ${table}`) ||
            normalizedQuery.includes(`truncate table ${table}`) ||
            normalizedQuery.includes(`drop table ${table}`)) {
            console.error(`🚫 BLOCKED: Attempted to delete/truncate/drop from protected table: ${table}`);
            return false;
        }
    }

    return true;
}

/**
 * Blocks user deletion and logs the attempt
 * Use this as a guard in any admin function
 * @param {string} action - The action being attempted
 * @param {string} userId - The user ID being targeted
 * @throws {Error} - Always throws to prevent deletion
 */
function blockUserDeletion(action, userId) {
    const errorMessage = `🚫 USER DELETION BLOCKED: Action "${action}" on user "${userId}" is not allowed. ` +
        `Users can only be deleted manually from the admin dashboard.`;

    console.error(errorMessage);
    console.error('Stack trace:', new Error().stack);

    // Could also send alert via n8n here
    // await sendAlert('User deletion attempted', { action, userId });

    throw new Error('User deletion is not permitted through this endpoint. ' +
        'Please use the admin dashboard for user management.');
}

/**
 * Soft delete a user by disabling their account
 * This is the ONLY way to "remove" a user programmatically
 * @param {object} sql - Neon SQL instance
 * @param {string} userId - The user ID to disable
 */
async function softDeleteUser(sql, userId) {
    console.log(`Soft deleting user ${userId} - setting status to DISABLED`);

    // Disable user status
    await sql`UPDATE users SET status = 'DISABLED', updated_at = NOW() WHERE id = ${userId}`;

    // Clear all sessions
    await sql`DELETE FROM sessions WHERE user_id = ${userId}::uuid`;

    // Revoke all enrollments
    await sql`UPDATE enrollments SET status = 'revoked' WHERE user_id = ${userId}::uuid`;

    console.log(`User ${userId} has been soft deleted (disabled)`);

    return { success: true, message: 'User has been disabled. Records preserved.' };
}

module.exports = {
    PROTECTED_TABLES,
    isQuerySafe,
    blockUserDeletion,
    softDeleteUser
};
