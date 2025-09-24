class MyRecipesPage {
    constructor() {
        this.currentPage = 1;
        this.recipesPerPage = 12;
        this.totalPages = 1;
        this.savedRecipes = [];
        
        this.init();
    }

    async init() {
        // Set up event listeners first
        this.setupEventListeners();
        
        // Wait for auth manager to be available
        await this.waitForAuthManager();
        
        // Check authentication status
        this.checkAuthStatus();
        
        // Load saved recipes if user is logged in
        if (window.authManager && window.authManager.isLoggedIn()) {
            await this.loadSavedRecipes();
        }
    }

    async waitForAuthManager() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!window.authManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.authManager) {
            console.warn('Auth manager not available after waiting');
        }
    }

    checkAuthStatus() {
        console.log('Checking auth status...');
        console.log('Auth manager available:', !!window.authManager);
        
        if (window.authManager) {
            console.log('User logged in:', window.authManager.isLoggedIn());
            console.log('Current user:', window.authManager.getUser());
            console.log('Token available:', !!window.authManager.getToken());
        }
        
        if (window.authManager && window.authManager.isLoggedIn()) {
            // User is logged in
            const authButtons = document.getElementById('auth-buttons');
            const userMenu = document.getElementById('user-menu');
            const userName = document.getElementById('user-name');
            
            if (authButtons) authButtons.style.display = 'none';
            if (userMenu) userMenu.style.display = 'flex';
            if (userName) userName.textContent = window.authManager.getUser().full_name || window.authManager.getUser().email;
            
            console.log('User is authenticated, showing user menu');
        } else {
            // User is not logged in, redirect to landing page
            console.log('User not authenticated, redirecting to landing page');
            this.showError('Please sign in to view your saved recipes');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    setupEventListeners() {
        // Pagination buttons
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPage());
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }

        // Auth buttons
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginBtn) {
            loginBtn.addEventListener('click', () => window.authManager.showAuthModal('login'));
        }
        
        if (signupBtn) {
            signupBtn.addEventListener('click', () => window.authManager.showAuthModal('signup'));
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => window.authManager.logout());
        }
    }

    async loadSavedRecipes() {
        try {
            this.showLoading();
            this.hideError();
            this.hideEmptyState();

            const result = await window.savedRecipesAPI.getMyRecipes(this.currentPage, this.recipesPerPage);
            
            if (result.success) {
                this.savedRecipes = result.data.recipes;
                this.totalPages = result.data.pagination.totalPages;
                
                if (this.savedRecipes.length === 0) {
                    this.showEmptyState();
                } else {
                    this.displaySavedRecipes();
                    this.updatePagination();
                }
            } else {
                this.showError(result.error || 'Failed to load saved recipes');
            }
        } catch (error) {
            console.error('Error loading saved recipes:', error);
            this.showError('Failed to load saved recipes. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    displaySavedRecipes() {
        const grid = document.getElementById('saved-recipes-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.savedRecipes.forEach(savedRecipe => {
            const recipeCard = this.createSavedRecipeCard(savedRecipe);
            grid.appendChild(recipeCard);
        });
    }

    createSavedRecipeCard(savedRecipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card saved-recipe-card';
        
        const recipe = savedRecipe.recipe_data;
        const savedDate = new Date(savedRecipe.created_at).toLocaleDateString();

        card.innerHTML = `
            <img src="${this.getRecipeImageUrl(recipe)}"
                 alt="${recipe.title}"
                 class="recipe-image"
                 onerror="this.src='https://via.placeholder.com/300x200/667eea/ffffff?text=Recipe'">

            <div class="recipe-content">
                <h3 class="recipe-title">${this.escapeHtml(recipe.title)}</h3>

                ${recipe.description ? `
                    <p class="recipe-description">${this.escapeHtml(recipe.description.substring(0, 100))}${recipe.description.length > 100 ? '...' : ''}</p>
                ` : ''}

                <div class="recipe-meta">
                    <div class="recipe-stats">
                        <span>⏱️ ${recipe.cookingTime || 'N/A'} min</span>
                        <span>👥 ${recipe.servings || 4} servings</span>
                        <span>📊 ${recipe.difficulty || 'medium'}</span>
                    </div>
                    
                    <div class="saved-date">
                        <span>💾 Saved on ${savedDate}</span>
                    </div>
                </div>

                ${recipe.aiGenerated ? `
                    <div class="ai-badge">🤖 AI Generated</div>
                ` : ''}

                ${recipe.cuisineType ? `
                    <div class="cuisine-badge">${recipe.cuisineType}</div>
                ` : ''}

                <div class="recipe-actions">
                    <button class="btn btn-primary btn-sm" 
                            onclick="myRecipesPage.viewRecipe('${this.escapeHtml(recipe.title)}', ${JSON.stringify(recipe).replace(/"/g, '&quot;')})"
                            title="View Recipe">
                        👁️ View
                    </button>
                    <button class="btn btn-danger btn-sm" 
                            onclick="myRecipesPage.deleteRecipe(${savedRecipe.id}, '${this.escapeHtml(recipe.title)}')"
                            title="Delete Recipe">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    async viewRecipe(recipeTitle, recipeData) {
        // Create a temporary app instance to show recipe details
        if (window.app && window.app.showRecipeDetails) {
            // Create a temporary recipe object with an ID
            const tempRecipe = { ...recipeData, id: 'temp-' + Date.now() };
            window.app.showRecipeDetails(tempRecipe);
        } else {
            // Fallback: show recipe in a simple modal
            this.showSimpleRecipeModal(recipeTitle, recipeData);
        }
    }

    showSimpleRecipeModal(recipeTitle, recipeData) {
        const modal = document.getElementById('recipe-modal');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalBody) return;

        modalBody.innerHTML = `
            <div class="recipe-detail">
                <h2>${this.escapeHtml(recipeTitle)}</h2>
                
                ${recipeData.description ? `
                    <p class="recipe-description">${this.escapeHtml(recipeData.description)}</p>
                ` : ''}

                <div class="recipe-meta">
                    <div class="recipe-stats">
                        <span>⏱️ ${recipeData.cookingTime || 'N/A'} minutes</span>
                        <span>👥 ${recipeData.servings || 4} servings</span>
                        <span>📊 ${recipeData.difficulty || 'medium'} difficulty</span>
                    </div>
                </div>

                ${recipeData.ingredients && recipeData.ingredients.length > 0 ? `
                    <div class="ingredients-section">
                        <h3>Ingredients</h3>
                        <ul class="ingredients-list">
                            ${recipeData.ingredients.map(ing => `
                                <li>${this.escapeHtml(ing.name || ing.original || ing)}</li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                ${recipeData.instructions && recipeData.instructions.length > 0 ? `
                    <div class="instructions-section">
                        <h3>Instructions</h3>
                        <ol class="instructions-list">
                            ${recipeData.instructions.map(instruction => `
                                <li>${this.escapeHtml(instruction)}</li>
                            `).join('')}
                        </ol>
                    </div>
                ` : ''}
            </div>
        `;

        modal.style.display = 'block';

        // Close modal when clicking the X
        const closeBtn = document.getElementById('modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }

    async deleteRecipe(recipeId, recipeTitle) {
        if (!confirm(`Are you sure you want to delete "${recipeTitle}"?`)) {
            return;
        }

        try {
            const result = await window.savedRecipesAPI.deleteRecipe(recipeId);
            
            if (result.success) {
                this.showSuccess('Recipe deleted successfully!');
                await this.loadSavedRecipes(); // Reload the list
            } else {
                this.showError(result.error || 'Failed to delete recipe');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
            this.showError('Failed to delete recipe. Please try again.');
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadSavedRecipes();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadSavedRecipes();
        }
    }

    updatePagination() {
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');
        const pagination = document.getElementById('pagination');

        if (pagination) {
            pagination.style.display = this.totalPages > 1 ? 'flex' : 'none';
        }

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }

        if (pageInfo) {
            pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
        }
    }

    getRecipeImageUrl(recipe) {
        if (recipe.imageUrl) return recipe.imageUrl;
        if (recipe.image) return recipe.image;
        return 'https://via.placeholder.com/300x200/667eea/ffffff?text=Recipe';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // UI State Management
    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'block';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.querySelector('p').textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    hideError() {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) errorDiv.style.display = 'none';
    }

    showEmptyState() {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = 'block';
    }

    hideEmptyState() {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = 'none';
    }

    showSuccess(message) {
        // Create success notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Hide notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.myRecipesPage = new MyRecipesPage();
});
