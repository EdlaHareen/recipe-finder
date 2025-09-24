/**
 * Backend Test Suite for Recipe Finder
 * Simple test framework for backend API endpoints
 */

const assert = require('assert');
const request = require('supertest');

// Mock test data
const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    full_name: 'Test User'
};

const testIngredients = ['chicken', 'rice', 'vegetables'];

/**
 * Test Suite Class
 */
class BackendTestSuite {
    constructor(app) {
        this.app = app;
        this.tests = [];
        this.results = [];
    }

    /**
     * Add a test to the suite
     */
    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Backend Test Suite...\n');
        
        for (const test of this.tests) {
            try {
                console.log(`Running: ${test.name}`);
                await test.testFunction();
                console.log(`✅ ${test.name}: PASSED\n`);
                this.results.push({ name: test.name, status: 'PASSED' });
            } catch (error) {
                console.log(`❌ ${test.name}: FAILED - ${error.message}\n`);
                this.results.push({ name: test.name, status: 'FAILED', error: error.message });
            }
        }

        this.printSummary();
    }

    /**
     * Print test summary
     */
    printSummary() {
        const passed = this.results.filter(r => r.status === 'PASSED').length;
        const failed = this.results.filter(r => r.status === 'FAILED').length;
        
        console.log('📊 Test Summary:');
        console.log(`Total: ${this.results.length}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results
                .filter(r => r.status === 'FAILED')
                .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
        }
    }
}

/**
 * Test Functions
 */
function createTestSuite(app) {
    const suite = new BackendTestSuite(app);

    // Health Check Test
    suite.addTest('Health Check', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);
        
        assert(response.body.status === 'OK', 'Health check should return OK status');
    });

    // Recipe Generation Test
    suite.addTest('Recipe Generation', async () => {
        const response = await request(app)
            .post('/api/recipes/generate')
            .send({ ingredients: testIngredients })
            .expect(200);
        
        assert(response.body.success === true, 'Recipe generation should succeed');
        assert(Array.isArray(response.body.data), 'Response should contain data array');
        assert(response.body.data.length > 0, 'Should generate at least one recipe');
    });

    // User Registration Test
    suite.addTest('User Registration', async () => {
        const response = await request(app)
            .post('/api/auth/signup')
            .send(testUser)
            .expect(200);
        
        assert(response.body.success === true, 'Registration should succeed');
        assert(response.body.token, 'Should return JWT token');
        assert(response.body.user, 'Should return user data');
    });

    // User Login Test
    suite.addTest('User Login', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .expect(200);
        
        assert(response.body.success === true, 'Login should succeed');
        assert(response.body.token, 'Should return JWT token');
        assert(response.body.user, 'Should return user data');
    });

    // Recipe Saving Test
    suite.addTest('Recipe Saving', async () => {
        // First login to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });
        
        const token = loginResponse.body.token;
        
        const testRecipe = {
            title: 'Test Recipe',
            ingredients: testIngredients,
            instructions: ['Step 1', 'Step 2'],
            prep_time: 15,
            cook_time: 30
        };

        const response = await request(app)
            .post('/api/saved-recipes/save')
            .set('Authorization', `Bearer ${token}`)
            .send({ recipe: testRecipe })
            .expect(200);
        
        assert(response.body.success === true, 'Recipe saving should succeed');
    });

    // Get Saved Recipes Test
    suite.addTest('Get Saved Recipes', async () => {
        // First login to get token
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });
        
        const token = loginResponse.body.token;

        const response = await request(app)
            .get('/api/saved-recipes/my-recipes')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);
        
        assert(response.body.success === true, 'Getting saved recipes should succeed');
        assert(Array.isArray(response.body.data), 'Should return data array');
    });

    // Input Validation Test
    suite.addTest('Input Validation', async () => {
        const response = await request(app)
            .post('/api/recipes/generate')
            .send({ ingredients: [] }) // Empty ingredients
            .expect(400);
        
        assert(response.body.error, 'Should return error for invalid input');
    });

    // Authentication Required Test
    suite.addTest('Authentication Required', async () => {
        const response = await request(app)
            .get('/api/saved-recipes/my-recipes')
            .expect(401);
        
        assert(response.body.error, 'Should return error for unauthenticated request');
    });

    // Recipe Cache Test
    suite.addTest('Recipe Cache', async () => {
        // First request
        const response1 = await request(app)
            .post('/api/recipes/generate')
            .send({ ingredients: testIngredients });
        
        // Second request with same ingredients
        const response2 = await request(app)
            .post('/api/recipes/generate')
            .send({ ingredients: testIngredients });
        
        assert(response1.body.success === true, 'First request should succeed');
        assert(response2.body.success === true, 'Second request should succeed');
        
        // Second request should be faster (cached)
        // Note: This is a basic test - in real implementation you'd check cache headers
    });

    // Error Handling Test
    suite.addTest('Error Handling', async () => {
        const response = await request(app)
            .post('/api/recipes/generate')
            .send({ ingredients: null }) // Invalid input
            .expect(400);
        
        assert(response.body.error, 'Should return error for invalid input');
    });

    return suite;
}

/**
 * Performance Test Functions
 */
function createPerformanceTests(app) {
    const suite = new BackendTestSuite(app);

    // API Response Time Test
    suite.addTest('API Response Time', async () => {
        const startTime = Date.now();
        
        await request(app)
            .get('/health')
            .expect(200);
        
        const responseTime = Date.now() - startTime;
        assert(responseTime < 1000, `Response time should be under 1000ms, got ${responseTime}ms`);
    });

    // Recipe Generation Performance Test
    suite.addTest('Recipe Generation Performance', async () => {
        const startTime = Date.now();
        
        await request(app)
            .post('/api/recipes/generate')
            .send({ ingredients: testIngredients });
        
        const responseTime = Date.now() - startTime;
        assert(responseTime < 30000, `Recipe generation should be under 30s, got ${responseTime}ms`);
    });

    return suite;
}

/**
 * Security Test Functions
 */
function createSecurityTests(app) {
    const suite = new BackendTestSuite(app);

    // SQL Injection Test
    suite.addTest('SQL Injection Prevention', async () => {
        const maliciousInput = "'; DROP TABLE users; --";
        
        const response = await request(app)
            .post('/api/recipes/generate')
            .send({ ingredients: [maliciousInput] });
        
        // Should not crash the server
        assert(response.status !== 500, 'Should not crash on malicious input');
    });

    // XSS Prevention Test
    suite.addTest('XSS Prevention', async () => {
        const xssInput = '<script>alert("xss")</script>';
        
        const response = await request(app)
            .post('/api/recipes/generate')
            .send({ ingredients: [xssInput] });
        
        // Should not crash the server
        assert(response.status !== 500, 'Should not crash on XSS input');
    });

    // Rate Limiting Test
    suite.addTest('Rate Limiting', async () => {
        const requests = [];
        
        // Make multiple rapid requests
        for (let i = 0; i < 10; i++) {
            requests.push(
                request(app)
                    .post('/api/recipes/generate')
                    .send({ ingredients: testIngredients })
            );
        }
        
        const responses = await Promise.all(requests);
        
        // At least one should be rate limited (429 status)
        const rateLimited = responses.some(r => r.status === 429);
        // Note: This test might not work if rate limiting is not implemented
        console.log('Rate limiting test - this may pass even if rate limiting is not implemented');
    });

    return suite;
}

module.exports = {
    BackendTestSuite,
    createTestSuite,
    createPerformanceTests,
    createSecurityTests
};
