// API Helper Functions

// Base fetch with authentication
async function apiFetch(endpoint, options = {}) {
    const token = auth.getSessionToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(endpoint, {
            ...options,
            headers
        });

        // Handle 401 - session expired
        if (response.status === 401) {
            auth.logout();
            window.location.href = auth.isAdmin() ? '/admin/login.html' : '/portal/login.html';
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// ADMIN API FUNCTIONS
// ============================================

const adminAPI = {
    // Dashboard stats
    async getDashboard() {
        return apiFetch('/.netlify/functions/admin-dashboard');
    },

    // Courses
    async getCourses() {
        return apiFetch('/.netlify/functions/admin-courses');
    },

    async getCourse(id) {
        return apiFetch(`/.netlify/functions/admin-courses?id=${id}`);
    },

    async createCourse(courseData) {
        return apiFetch('/.netlify/functions/admin-courses', {
            method: 'POST',
            body: JSON.stringify({ action: 'create', ...courseData })
        });
    },

    async updateCourse(id, courseData) {
        return apiFetch('/.netlify/functions/admin-courses', {
            method: 'POST',
            body: JSON.stringify({ action: 'update', id, ...courseData })
        });
    },

    async deleteCourse(id) {
        return apiFetch('/.netlify/functions/admin-courses', {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', id })
        });
    },

    // Modules
    async getModules(courseId) {
        return apiFetch(`/.netlify/functions/admin-modules?courseId=${courseId}`);
    },

    async createModule(moduleData) {
        return apiFetch('/.netlify/functions/admin-modules', {
            method: 'POST',
            body: JSON.stringify({ action: 'create', ...moduleData })
        });
    },

    async updateModule(id, moduleData) {
        return apiFetch('/.netlify/functions/admin-modules', {
            method: 'POST',
            body: JSON.stringify({ action: 'update', id, ...moduleData })
        });
    },

    async deleteModule(id) {
        return apiFetch('/.netlify/functions/admin-modules', {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', id })
        });
    },

    // Lessons
    async getLessons(moduleId) {
        return apiFetch(`/.netlify/functions/admin-lessons?moduleId=${moduleId}`);
    },

    async getLesson(id) {
        return apiFetch(`/.netlify/functions/admin-lessons?id=${id}`);
    },

    async createLesson(lessonData) {
        return apiFetch('/.netlify/functions/admin-lessons', {
            method: 'POST',
            body: JSON.stringify({ action: 'create', ...lessonData })
        });
    },

    async updateLesson(id, lessonData) {
        return apiFetch('/.netlify/functions/admin-lessons', {
            method: 'POST',
            body: JSON.stringify({ action: 'update', id, ...lessonData })
        });
    },

    async deleteLesson(id) {
        return apiFetch('/.netlify/functions/admin-lessons', {
            method: 'POST',
            body: JSON.stringify({ action: 'delete', id })
        });
    },

    // Customers
    async getCustomers(page = 1, limit = 20) {
        return apiFetch(`/.netlify/functions/admin-customers?page=${page}&limit=${limit}`);
    },

    async getCustomer(id) {
        return apiFetch(`/.netlify/functions/admin-customers?id=${id}`);
    },

    async grantAccess(userId, courseId) {
        return apiFetch('/.netlify/functions/admin-customers', {
            method: 'POST',
            body: JSON.stringify({ action: 'grant_access', userId, courseId })
        });
    },

    async revokeAccess(userId, courseId) {
        return apiFetch('/.netlify/functions/admin-customers', {
            method: 'POST',
            body: JSON.stringify({ action: 'revoke_access', userId, courseId })
        });
    },

    // Grant course access to a user
    async grantCourseAccess(userId, courseId) {
        return apiFetch('/.netlify/functions/admin-grant-access', {
            method: 'POST',
            body: JSON.stringify({ userId, courseId })
        });
    },

    // Send password reset email
    async sendPasswordReset(email) {
        return apiFetch('/.netlify/functions/admin-password-reset', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    // Change admin password
    async changeAdminPassword(currentPassword, newPassword) {
        return apiFetch('/.netlify/functions/admin-change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    },

    // Get all products
    async getProducts() {
        return apiFetch('/.netlify/functions/admin-products');
    },

    // Grant product access to a user
    async grantProductAccess(userId, productId) {
        return apiFetch('/.netlify/functions/admin-grant-product', {
            method: 'POST',
            body: JSON.stringify({ userId, productId })
        });
    }
};

// ============================================
// PORTAL API FUNCTIONS
// ============================================

const portalAPI = {
    // Get enrolled courses
    async getMyCourses() {
        return apiFetch('/.netlify/functions/portal-courses');
    },

    // Get course detail with lessons
    async getCourse(slug) {
        return apiFetch(`/.netlify/functions/portal-course-detail?slug=${slug}`);
    },

    // Get lesson
    async getLesson(lessonId) {
        return apiFetch(`/.netlify/functions/portal-lesson?id=${lessonId}`);
    },

    // Update progress
    async updateProgress(lessonId, data) {
        return apiFetch('/.netlify/functions/portal-progress', {
            method: 'POST',
            body: JSON.stringify({ lessonId, ...data })
        });
    },

    // Mark lesson complete
    async markComplete(lessonId) {
        return apiFetch('/.netlify/functions/portal-progress', {
            method: 'POST',
            body: JSON.stringify({ lessonId, is_completed: true })
        });
    },

    // Get user profile
    async getProfile() {
        return apiFetch('/.netlify/functions/portal-profile');
    },

    // Update profile
    async updateProfile(data) {
        return apiFetch('/.netlify/functions/portal-profile', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Change password
    async changePassword(currentPassword, newPassword) {
        return apiFetch('/.netlify/functions/portal-change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }
};

// Export
window.api = { apiFetch, admin: adminAPI, portal: portalAPI };
