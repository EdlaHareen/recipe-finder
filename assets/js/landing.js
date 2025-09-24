// Landing Page Interactive Components
class LandingPage {
    constructor() {
        this.initializeLanding();
    }

    initializeLanding() {
        this.bindEvents();
        this.initializeScrollAnimations();
        this.initializeTypewriter();
    }

    bindEvents() {
        // Get Started buttons
        const getStartedBtn = document.getElementById('get-started-btn');
        const ctaGetStartedBtn = document.getElementById('cta-get-started');
        const watchDemoBtn = document.getElementById('watch-demo-btn');

        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', () => this.showRecipeFinder());
        }

        if (ctaGetStartedBtn) {
            ctaGetStartedBtn.addEventListener('click', () => this.showRecipeFinder());
        }

        if (watchDemoBtn) {
            watchDemoBtn.addEventListener('click', () => this.showDemo());
        }

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Add scroll event listener for animations
        window.addEventListener('scroll', () => this.handleScroll());
    }

    showRecipeFinder() {
        try {
            // Check if user is logged in
            if (window.authManager && window.authManager.isLoggedIn()) {
                // User is logged in, redirect to pantry page
                window.location.href = 'pantry.html';
            } else {
                // User is not logged in, show authentication modal
                this.showAuthModal('login');
                this.showSuccess('Please sign in to start cooking!');
            }
        } catch (error) {
            console.error('Error showing recipe finder:', error);
            this.showError('Unable to load recipe finder');
        }
    }

    showAuthModal(formType = 'login') {
        try {
            if (window.authManager) {
                window.authManager.showAuthModal(formType);
            } else {
                console.error('Auth manager not available');
                this.showError('Authentication not available');
            }
        } catch (error) {
            console.error('Error showing auth modal:', error);
            this.showError('Unable to show authentication');
        }
    }

    showDemo() {
        // Create a demo modal or show a quick demo
        this.showDemoModal();
    }

    showDemoModal() {
        const demoModal = document.createElement('div');
        demoModal.className = 'modal';
        demoModal.style.display = 'block';
        demoModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
                <div class="demo-content">
                    <h2>🎬 Recipe Finder Demo</h2>
                    <div class="demo-steps">
                        <div class="demo-step">
                            <div class="demo-icon">📝</div>
                            <h3>1. Add Ingredients</h3>
                            <p>Type in ingredients like "chicken, rice, vegetables" or upload a photo</p>
                        </div>
                        <div class="demo-step">
                            <div class="demo-icon">🤖</div>
                            <h3>2. AI Magic</h3>
                            <p>Our AI analyzes your ingredients and creates personalized recipes</p>
                        </div>
                        <div class="demo-step">
                            <div class="demo-icon">🍳</div>
                            <h3>3. Cook & Enjoy</h3>
                            <p>Follow step-by-step instructions with beautiful AI-generated images</p>
                        </div>
                    </div>
                    <div class="demo-buttons">
                        <button class="btn btn-primary" onclick="this.closest('.modal').remove(); window.landingPage.showRecipeFinder();">
                            Try It Now
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(demoModal);
        document.body.style.overflow = 'hidden';

        // Close modal when clicking outside
        demoModal.addEventListener('click', (e) => {
            if (e.target === demoModal) {
                demoModal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    }

    initializeScrollAnimations() {
        // Add animation classes to elements
        const animatedElements = document.querySelectorAll('.feature-card, .step, .section-header');
        animatedElements.forEach(el => {
            el.classList.add('animate-on-scroll');
        });
    }

    handleScroll() {
        // Throttle scroll events for better performance
        if (this.scrollTimeout) {
            return;
        }
        
        this.scrollTimeout = setTimeout(() => {
            const elements = document.querySelectorAll('.animate-on-scroll:not(.animated)');
            elements.forEach(el => {
                const elementTop = el.getBoundingClientRect().top;
                const elementVisible = 150;

                if (elementTop < window.innerHeight - elementVisible) {
                    el.classList.add('animated');
                }
            });
            this.scrollTimeout = null;
        }, 16); // ~60fps
    }

    initializeTypewriter() {
        // Add typewriter effect to hero title
        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle) {
            const text = heroTitle.innerHTML;
            heroTitle.innerHTML = '';
            heroTitle.style.borderRight = '2px solid #ffd700';
            
            let i = 0;
            const typeWriter = () => {
                if (i < text.length) {
                    heroTitle.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(typeWriter, 50);
                } else {
                    setTimeout(() => {
                        heroTitle.style.borderRight = 'none';
                    }, 1000);
                }
            };

            // Start typewriter effect after a short delay
            setTimeout(typeWriter, 1000);
        }
    }

    // Add interactive hover effects
    addInteractiveEffects() {
        // Add hover effects to feature cards
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-10px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });

        // Add click effects to buttons
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Create ripple effect
                const ripple = document.createElement('span');
                const rect = btn.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
                ripple.style.width = ripple.style.height = size + 'px';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                ripple.classList.add('ripple');
                
                btn.appendChild(ripple);
                
                setTimeout(() => {
                    ripple.remove();
                }, 600);
            });
        });
    }

    // Add parallax effect to hero section
    addParallaxEffect() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const hero = document.querySelector('.hero');
            if (hero) {
                hero.style.transform = `translateY(${scrolled * 0.5}px)`;
            }
        });
    }

    // Initialize counter animations for stats
    animateCounters() {
        const counters = document.querySelectorAll('.stat-number');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counter = entry.target;
                    const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
                    const increment = target / 100;
                    let current = 0;
                    
                    const updateCounter = () => {
                        if (current < target) {
                            current += increment;
                            counter.textContent = Math.ceil(current) + '+';
                            requestAnimationFrame(updateCounter);
                        } else {
                            counter.textContent = target + '+';
                        }
                    };
                    
                    updateCounter();
                    observer.unobserve(counter);
                }
            });
        });

        counters.forEach(counter => {
            observer.observe(counter);
        });
    }

    // Update authentication UI based on login status
    updateAuthUI() {
        if (window.authManager && window.authManager.isLoggedIn()) {
            // User is logged in - hide auth buttons, show user menu
            const authButtons = document.getElementById('auth-buttons');
            const userMenu = document.getElementById('user-menu');
            
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            
            // If user is on landing page and logged in, redirect to pantry
            if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
                setTimeout(() => {
                    window.location.href = 'pantry.html';
                }, 2000); // Give user time to see they're logged in
            }
        }
    }

    // Error handling methods
    showError(message) {
        // Create error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e53e3e;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease-in;
            max-width: 300px;
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    showSuccess(message) {
        // Create success notification
        const successDiv = document.createElement('div');
        successDiv.className = 'success-notification';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1000;
            animation: slideIn 0.3s ease-in;
            max-width: 300px;
        `;
        successDiv.textContent = message;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Add CSS for demo modal and ripple effect
const additionalStyles = `
    .demo-content {
        padding: 2rem;
        text-align: center;
    }

    .demo-steps {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 2rem;
        margin: 2rem 0;
    }

    .demo-step {
        text-align: center;
    }

    .demo-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
    }

    .demo-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
    }

    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
        pointer-events: none;
    }

    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;

// Add styles to the page
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize landing page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth manager to be available
    const initLanding = () => {
        if (window.authManager) {
            window.landingPage = new LandingPage();
            window.landingPage.addInteractiveEffects();
            window.landingPage.addParallaxEffect();
            window.landingPage.animateCounters();
            window.landingPage.updateAuthUI();
        } else {
            // Retry after a short delay
            setTimeout(initLanding, 100);
        }
    };
    
    initLanding();
});
