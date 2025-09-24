# Recipe Finder Test Suite

This directory contains comprehensive tests for the Recipe Finder application, including frontend, backend, and performance tests.

## Test Structure

```
tests/
├── README.md              # This file
├── test-runner.html       # Frontend test runner (browser-based)
├── backend-tests.js       # Backend test suite
├── run-tests.js          # Main test runner script
└── test-results/         # Test results and reports (generated)
```

## Running Tests

### Run All Tests
```bash
cd tests
node run-tests.js
```

### Run Specific Test Suites
```bash
# Backend tests only
node run-tests.js --backend

# Frontend tests only
node run-tests.js --frontend

# Performance tests only
node run-tests.js --performance
```

### Frontend Tests (Browser)
Open `test-runner.html` in your browser to run interactive frontend tests.

## Test Categories

### 🔧 Core Functionality Tests
- **Recipe Generation**: Tests AI-powered recipe generation with valid ingredients
- **Recipe Saving**: Tests saving recipes to user's collection
- **Authentication**: Tests user registration and login flow
- **Recipe Persistence**: Tests localStorage functionality for recipe persistence

### 🎨 UI/UX Tests
- **Image Lazy Loading**: Tests IntersectionObserver-based lazy loading
- **Notification System**: Tests user feedback notifications
- **Mobile Responsiveness**: Tests mobile viewport and touch interactions
- **Debounced Search**: Tests input debouncing for performance

### 🔒 Security Tests
- **Input Validation**: Tests input sanitization and validation
- **Authentication Token Handling**: Tests JWT token structure and validation
- **XSS Prevention**: Tests cross-site scripting prevention
- **SQL Injection Prevention**: Tests database query protection

### ⚡ Performance Tests
- **Page Load Time**: Tests initial page load performance
- **API Response Time**: Tests backend API response times
- **Memory Usage**: Tests JavaScript memory consumption
- **Recipe Generation Performance**: Tests AI API response times

## Test Framework Features

### Frontend Test Runner
- **Interactive Interface**: Browser-based test runner with visual feedback
- **Real-time Results**: Live test results with pass/fail indicators
- **Test Statistics**: Comprehensive test statistics and progress tracking
- **Manual Testing**: Support for manual test execution and verification

### Backend Test Suite
- **API Testing**: Comprehensive API endpoint testing
- **Authentication Testing**: JWT token and user authentication tests
- **Database Testing**: Recipe saving and retrieval tests
- **Error Handling**: Input validation and error response tests

### Performance Monitoring
- **Response Time Tracking**: API and page load time measurements
- **Memory Usage Monitoring**: JavaScript heap size tracking
- **Cache Performance**: Recipe caching effectiveness tests
- **Mobile Performance**: Mobile-specific performance tests

## Test Data

### Test Users
```javascript
const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    full_name: 'Test User'
};
```

### Test Ingredients
```javascript
const testIngredients = ['chicken', 'rice', 'vegetables'];
```

### Test Recipes
```javascript
const testRecipe = {
    title: 'Test Recipe',
    ingredients: ['chicken', 'rice', 'vegetables'],
    instructions: ['Step 1', 'Step 2'],
    prep_time: 15,
    cook_time: 30
};
```

## Writing New Tests

### Frontend Tests
Add new tests to `test-runner.html`:

```javascript
testFramework.addTest('my-new-test', async () => {
    // Test implementation
    return true; // or false for failure
});
```

### Backend Tests
Add new tests to `backend-tests.js`:

```javascript
suite.addTest('My New Test', async () => {
    const response = await request(app)
        .get('/api/endpoint')
        .expect(200);
    
    assert(response.body.success === true, 'Test should pass');
});
```

## Test Configuration

### Environment Variables
Tests use the same environment variables as the main application:
- `NODE_ENV=test`
- `PORT=3001`
- `OPENAI_API_KEY=your_test_key`
- `SUPABASE_URL=your_test_url`
- `SUPABASE_ANON_KEY=your_test_key`

### Test Database
Tests use a separate test database to avoid affecting production data.

## Continuous Integration

### GitHub Actions
```yaml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd tests && node run-tests.js --backend
```

### Pre-commit Hooks
```bash
# Install pre-commit hook
echo "cd tests && node run-tests.js --backend" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Test Results

### Success Criteria
- **Backend Tests**: All API endpoints return expected responses
- **Frontend Tests**: All UI components function correctly
- **Performance Tests**: Response times within acceptable limits
- **Security Tests**: All security measures working properly

### Performance Benchmarks
- **Page Load Time**: < 3 seconds
- **API Response Time**: < 1 second (except recipe generation)
- **Recipe Generation**: < 30 seconds
- **Memory Usage**: < 80% of available heap

## Troubleshooting

### Common Issues

#### Backend Tests Failing
- Check if backend server is running
- Verify environment variables are set
- Check database connection
- Ensure all dependencies are installed

#### Frontend Tests Not Working
- Open test runner in a modern browser
- Check browser console for errors
- Ensure all JavaScript files are loaded
- Verify localStorage is available

#### Performance Tests Failing
- Check network connection
- Verify API keys are valid
- Check server resources
- Monitor system performance

### Debug Mode
Run tests with debug output:
```bash
DEBUG=true node run-tests.js
```

## Contributing

### Adding New Tests
1. Identify the test category (Core, UI/UX, Security, Performance)
2. Write the test following existing patterns
3. Add appropriate assertions
4. Update documentation
5. Test the new test

### Test Best Practices
- **Isolated Tests**: Each test should be independent
- **Clear Assertions**: Use descriptive assertion messages
- **Mock Data**: Use consistent test data
- **Error Handling**: Test both success and failure cases
- **Performance**: Keep tests fast and efficient

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [Performance Testing Guide](https://web.dev/performance-testing/)
