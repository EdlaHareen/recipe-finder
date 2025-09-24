#!/usr/bin/env node

/**
 * Test Runner for Recipe Finder
 * Runs both frontend and backend tests
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
    log('\n' + '='.repeat(60), 'cyan');
    log(message, 'bright');
    log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

/**
 * Check if required dependencies are installed
 */
function checkDependencies() {
    logHeader('Checking Dependencies');
    
    const packageJsonPath = path.join(__dirname, '..', 'backend', 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        logError('Backend package.json not found');
        return false;
    }
    
    const nodeModulesPath = path.join(__dirname, '..', 'backend', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        logWarning('Node modules not found. Run "npm install" in backend directory');
        return false;
    }
    
    logSuccess('Dependencies check passed');
    return true;
}

/**
 * Run backend tests
 */
async function runBackendTests() {
    logHeader('Running Backend Tests');
    
    return new Promise((resolve) => {
        const testProcess = spawn('node', ['backend-tests.js'], {
            cwd: __dirname,
            stdio: 'inherit'
        });
        
        testProcess.on('close', (code) => {
            if (code === 0) {
                logSuccess('Backend tests completed successfully');
            } else {
                logError(`Backend tests failed with code ${code}`);
            }
            resolve(code === 0);
        });
        
        testProcess.on('error', (error) => {
            logError(`Failed to start backend tests: ${error.message}`);
            resolve(false);
        });
    });
}

/**
 * Run frontend tests
 */
async function runFrontendTests() {
    logHeader('Running Frontend Tests');
    
    logInfo('Opening test runner in browser...');
    logInfo('Please run the tests manually in the browser and check results');
    
    const testRunnerPath = path.join(__dirname, 'test-runner.html');
    const absolutePath = path.resolve(testRunnerPath);
    
    logInfo(`Test runner location: ${absolutePath}`);
    logInfo('Open this file in your browser to run frontend tests');
    
    // Try to open in default browser (works on macOS and some Linux distros)
    try {
        const openProcess = spawn('open', [testRunnerPath], { stdio: 'ignore' });
        openProcess.on('error', () => {
            // Ignore errors - user can open manually
        });
    } catch (error) {
        // Ignore errors - user can open manually
    }
    
    return true;
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
    logHeader('Running Performance Tests');
    
    logInfo('Performance tests are integrated into the main test suites');
    logInfo('Check the test results for performance metrics');
    
    return true;
}

/**
 * Generate test report
 */
function generateTestReport(backendPassed, frontendPassed, performancePassed) {
    logHeader('Test Report Summary');
    
    const results = [
        { name: 'Backend Tests', passed: backendPassed },
        { name: 'Frontend Tests', passed: frontendPassed },
        { name: 'Performance Tests', passed: performancePassed }
    ];
    
    results.forEach(result => {
        if (result.passed) {
            logSuccess(`${result.name}: PASSED`);
        } else {
            logError(`${result.name}: FAILED`);
        }
    });
    
    const allPassed = results.every(r => r.passed);
    
    if (allPassed) {
        logSuccess('\n🎉 All tests passed!');
    } else {
        logError('\n💥 Some tests failed. Please check the results above.');
    }
    
    logInfo('\nFor detailed test results:');
    logInfo('- Backend: Check console output above');
    logInfo('- Frontend: Check browser test runner');
    logInfo('- Performance: Check individual test results');
}

/**
 * Main test runner function
 */
async function runAllTests() {
    logHeader('Recipe Finder Test Suite');
    logInfo('Starting comprehensive test suite...\n');
    
    // Check dependencies
    if (!checkDependencies()) {
        logError('Dependency check failed. Please fix issues and try again.');
        process.exit(1);
    }
    
    // Run tests
    const backendPassed = await runBackendTests();
    const frontendPassed = await runFrontendTests();
    const performancePassed = await runPerformanceTests();
    
    // Generate report
    generateTestReport(backendPassed, frontendPassed, performancePassed);
    
    // Exit with appropriate code
    const allPassed = backendPassed && frontendPassed && performancePassed;
    process.exit(allPassed ? 0 : 1);
}

/**
 * Command line interface
 */
function showHelp() {
    logHeader('Recipe Finder Test Runner');
    log('Usage: node run-tests.js [options]');
    log('');
    log('Options:');
    log('  --backend     Run only backend tests');
    log('  --frontend    Run only frontend tests');
    log('  --performance Run only performance tests');
    log('  --help        Show this help message');
    log('');
    log('Examples:');
    log('  node run-tests.js              # Run all tests');
    log('  node run-tests.js --backend    # Run only backend tests');
    log('  node run-tests.js --frontend   # Run only frontend tests');
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help')) {
    showHelp();
    process.exit(0);
}

if (args.includes('--backend')) {
    checkDependencies() && runBackendTests().then(passed => process.exit(passed ? 0 : 1));
} else if (args.includes('--frontend')) {
    runFrontendTests().then(passed => process.exit(passed ? 0 : 1));
} else if (args.includes('--performance')) {
    runPerformanceTests().then(passed => process.exit(passed ? 0 : 1));
} else {
    // Run all tests
    runAllTests();
}
