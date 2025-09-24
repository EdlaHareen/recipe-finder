// Main Application Logic for Recipe Finder
class RecipeFinderApp {
    constructor() {
        this.ingredients = [];
        this.currentRecipes = [];
        this.initializeApp();
    }

    initializeApp() {
        this.loadIngredientsFromStorage();
        this.loadRecipesFromStorage();
        this.bindEvents();
        this.updateUI();
        this.displayRecipes(this.currentRecipes);
        this.initializeLazyLoading();
        
        // Clear old recipes with DALL-E URLs to force regeneration with new system
        this.clearOldDalleRecipes();
        
        console.log('🍳 Recipe Finder App initialized');
    }

    // Event Binding
    bindEvents() {
        // Ingredient input events
        const ingredientInput = document.getElementById('ingredient-input');
        const addIngredientBtn = document.getElementById('add-ingredient-btn');

        if (addIngredientBtn) {
            addIngredientBtn.addEventListener('click', () => this.addIngredient());
        }
        if (ingredientInput) {
            ingredientInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addIngredient();
                }
            });
        }

        // Debounced search for ingredient suggestions
        if (ingredientInput) {
            ingredientInput.addEventListener('input', this.debounce((e) => {
                this.handleIngredientInput(e);
            }, 300));
        }

        // Image upload event
        const imageInput = document.getElementById('image-input');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Search recipes button
        const searchBtn = document.getElementById('search-recipes-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchRecipes());
        }

        // Modal events
        const modal = document.getElementById('recipe-modal');
        const modalClose = document.getElementById('modal-close');

        modalClose.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Keyboard shortcut for modal close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Ingredient Management
    addIngredient(ingredientName = null) {
        const input = document.getElementById('ingredient-input');
        const rawIngredient = ingredientName || input.value.trim();

        if (!rawIngredient) {
            this.showError('Please enter an ingredient name');
            return;
        }

        // Clean and validate the ingredient name
        const ingredient = rawIngredient.toLowerCase()
            .replace(/[^a-zA-Z\s]/g, '') // Remove special characters except spaces
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

        if (!ingredient || ingredient.length < 2) {
            this.showError('Please enter a valid ingredient name (at least 2 characters)');
            input.value = '';
            return;
        }

        if (this.ingredients.includes(ingredient)) {
            this.showError('This ingredient is already in your pantry');
            input.value = '';
            return;
        }

        if (this.ingredients.length >= CONFIG.APP.MAX_INGREDIENTS) {
            this.showError(`You can only add up to ${CONFIG.APP.MAX_INGREDIENTS} ingredients`);
            return;
        }

        this.ingredients.push(ingredient);
        input.value = '';

        this.updateUI();
        this.saveIngredientsToStorage();

        console.log('✅ Added ingredient:', ingredient);
    }

    removeIngredient(ingredient) {
        const index = this.ingredients.indexOf(ingredient);
        if (index > -1) {
            this.ingredients.splice(index, 1);
            this.updateUI();
            this.saveIngredientsToStorage();
            console.log('🗑️ Removed ingredient:', ingredient);
        }
    }

    clearAllIngredients() {
        this.ingredients = [];
        this.updateUI();
        this.saveIngredientsToStorage();
        console.log('🧹 Cleared all ingredients');
    }

    // AI-Powered Image Upload and Processing
    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showError('Please select a valid image file');
            return;
        }

        this.showLoading('🤖 AI is analyzing your image...');

        try {
            const result = await recipeAPI.analyzeIngredientImage(file);

            if (result.success && result.data.ingredients.length > 0) {
                const detectedIngredients = result.data.ingredients
                    .filter(ing => ing.confidence > 0.5) // Only use high-confidence results
                    .slice(0, 3); // Limit to top 3 ingredients

                if (detectedIngredients.length > 0) {
                    // Add detected ingredients
                    detectedIngredients.forEach(ingredient => {
                        this.addIngredient(ingredient.name);
                    });

                    const ingredientNames = detectedIngredients.map(ing => ing.name).join(', ');

                    if (result.fallback) {
                        this.showWarning(`⚠️ Detected: ${ingredientNames} (offline mode)`);
                    } else {
                        this.showSuccess(`🤖 AI detected: ${ingredientNames}`);
                    }

                    // Show analysis details
                    if (result.data.analysis) {
                        console.log('AI Analysis:', result.data.analysis);
                    }
                } else {
                    this.showError('AI could not identify ingredients with high confidence. Try a clearer image.');
                }
            } else {
                this.showError(result.error || 'Could not analyze the image');
            }
        } catch (error) {
            console.error('Image processing error:', error);
            this.showError('Failed to process image');
        } finally {
            this.hideLoading();
            event.target.value = ''; // Reset file input
        }
    }

    async simulateImageRecognition(file) {
        // Simulate image recognition delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock results based on file name or random selection
        const commonIngredients = [
            'tomato', 'potato', 'onion', 'carrot', 'apple', 'banana',
            'chicken', 'beef', 'cheese', 'bread', 'lettuce', 'pepper'
        ];

        // Try to extract ingredient from filename
        const fileName = file.name.toLowerCase();
        const detected = commonIngredients.find(ingredient =>
            fileName.includes(ingredient)
        );

        // Return detected ingredient or random one for demo
        return detected || commonIngredients[Math.floor(Math.random() * commonIngredients.length)];
    }

    // AI-Powered Recipe Search
    async searchRecipes() {
        if (this.ingredients.length === 0) {
            this.showError('Please add at least one ingredient to search for recipes');
            return;
        }

        this.showLoading('🤖 AI is generating personalized recipes for you...');
        this.hideError();

        try {
            // Get user preferences for better AI generation
            const preferences = this.getUserPreferences();

            const result = await recipeAPI.generateRecipesByIngredients(this.ingredients, {
                count: CONFIG.APP.DEFAULT_RECIPE_COUNT,
                ...preferences
            });

            if (result.success) {
                this.currentRecipes = result.data;
                this.saveRecipesToStorage(result.data);
                this.displayRecipes(result.data);

                if (result.data.length === 0) {
                    this.showError('No recipes could be generated with your ingredients. Try adding different ingredients.');
                } else {
                    // Show success message for AI-generated recipes
                    if (result.data[0]?.aiGenerated) {
                        this.showSuccess(`🤖 Generated ${result.data.length} AI-powered recipes for you!`);
                    } else if (result.data[0]?.fallback) {
                        this.showWarning('⚠️ Using offline mode. Connect to internet for AI-powered recipes.');
                    }
                }
            } else {
                this.showError(result.error || 'Failed to generate recipes');
            }
        } catch (error) {
            console.error('Recipe generation error:', error);
            this.showError('An error occurred while generating recipes. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    // Recipe Display
    displayRecipes(recipes) {
        const resultsSection = document.getElementById('results-section');
        const recipeGrid = document.getElementById('recipe-grid');

        if (!recipes || recipes.length === 0) {
            resultsSection.style.display = 'none';
            return;
        }

        recipeGrid.innerHTML = '';

        recipes.forEach(recipe => {
            const recipeCard = this.createRecipeCard(recipe);
            recipeGrid.appendChild(recipeCard);
        });

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Initialize lazy loading for new images
        this.initializeLazyLoading();
    }

    createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.onclick = () => this.showRecipeDetails(recipe.id || recipe.dbId);

        // Handle both AI-generated and legacy recipe formats
        const ingredients = recipe.ingredients || [];
        const haveIngredients = ingredients.filter(ing => ing.have === true);
        const missingIngredients = ingredients.filter(ing => ing.have === false);

        // For legacy format compatibility
        const usedCount = haveIngredients.length || recipe.usedIngredientCount || 0;
        const missingCount = missingIngredients.length || recipe.missedIngredientCount || 0;

        card.innerHTML = `
            <img data-src="${this.getRecipeImageUrl(recipe)}"
                 alt="${recipe.title}"
                 class="recipe-image lazy-load"
                 src="https://via.placeholder.com/300x200/f8f9fa/6c757d?text=Loading..."
                 onload="console.log('✅ Image loaded successfully:', this.src)"
                 onerror="console.error('❌ Image failed to load:', this.src); this.src='https://via.placeholder.com/300x200/667eea/ffffff?text=Recipe'"

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

                    <div class="recipe-ingredients-summary">
                        <span class="ingredients-have">✅ ${usedCount} you have</span>
                        ${missingCount > 0 ? `
                            <span class="missing-ingredients">❌ ${missingCount} missing</span>
                        ` : ''}
                    </div>
                </div>

                ${recipe.aiGenerated ? `
                    <div class="ai-badge">🤖 AI Generated</div>
                ` : ''}

                ${recipe.cuisineType ? `
                    <div class="cuisine-badge">${recipe.cuisineType}</div>
                ` : ''}

                <div class="recipe-actions">
                    <button class="btn btn-primary btn-sm save-recipe-btn" 
                            data-recipe-title="${this.escapeHtml(recipe.title)}"
                            data-recipe-data='${JSON.stringify(recipe)}'
                            onclick="event.stopPropagation(); app.saveRecipeFromButton(this)"
                            title="Save Recipe">
                        💾 Save
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    getIngredientsList(ingredients) {
        if (!ingredients || ingredients.length === 0) return '';
        return ingredients.slice(0, 3)
            .map(ing => this.escapeHtml(ing.name || ing.original || 'Unknown'))
            .join(', ') + (ingredients.length > 3 ? '...' : '');
    }

    // Recipe Details Modal
    async showRecipeDetails(recipeId) {
        this.showModal();

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading recipe details...</p></div>';

        try {
            // Find the recipe in current recipes (AI-generated recipes already have all details)
            let recipe = this.currentRecipes.find(r => r.id === recipeId || r.dbId === recipeId);

            if (recipe) {
                // Use the full recipe data we already have
                modalBody.innerHTML = this.createRecipeDetailsHTML(recipe);
                return;
            }

            // If not found in current recipes, try to fetch from backend
            let result;
            if (recipeAPI.isBackendConnected()) {
                result = await recipeAPI.getRecipeDetails(recipeId);
            } else {
                result = recipeAPI.getFallbackRecipeDetails(recipeId);
            }

            if (result.success) {
                modalBody.innerHTML = this.createRecipeDetailsHTML(result.data);
            } else {
                modalBody.innerHTML = `<div class="error-message"><p>Failed to load recipe details</p></div>`;
            }
        } catch (error) {
            console.error('Recipe details error:', error);
            modalBody.innerHTML = `<div class="error-message"><p>An error occurred while loading the recipe</p></div>`;
        }
    }

    createRecipeDetailsHTML(recipe) {
        // Handle both AI-generated and legacy recipe formats
        const instructions = recipe.instructions ||
                           (recipe.analyzedInstructions && recipe.analyzedInstructions[0]
                            ? recipe.analyzedInstructions[0].steps
                            : []);

        const ingredients = recipe.ingredients || recipe.extendedIngredients || [];

        return `
            <img src="${this.getRecipeImageUrl(recipe)}"
                 alt="${recipe.title}"
                 class="modal-recipe-image"
                 onload="console.log('✅ Modal image loaded successfully:', this.src)"
                 onerror="console.error('❌ Modal image failed to load:', this.src); this.src='https://via.placeholder.com/400x300/667eea/ffffff?text=Recipe'"

            <h2 class="modal-recipe-title">${this.escapeHtml(recipe.title)}</h2>

            ${recipe.aiGenerated ? `
                <div class="ai-badge" style="position: static; margin-bottom: 1rem;">🤖 AI Generated Recipe</div>
            ` : ''}

            <div class="modal-recipe-meta">
                <div><strong>⏱️ Ready in:</strong> ${recipe.cookingTime || recipe.readyInMinutes || 'N/A'} minutes</div>
                <div><strong>👥 Servings:</strong> ${recipe.servings || 'N/A'}</div>
                <div><strong>📊 Difficulty:</strong> ${recipe.difficulty || 'Medium'}</div>
                ${recipe.cuisineType ? `<div><strong>🌍 Cuisine:</strong> ${recipe.cuisineType}</div>` : ''}
            </div>

            ${recipe.description || recipe.summary ? `
                <div class="recipe-summary">
                    <p>${this.escapeHtml(recipe.description || this.stripHTML(recipe.summary))}</p>
                </div>
            ` : ''}

            <div class="ingredients-section">
                <h3>📝 Ingredients</h3>
                <ul class="ingredients-list-modal">
                    ${ingredients.length > 0 ? ingredients.map(ingredient => {
                        const ingredientName = ingredient.item || ingredient.name || ingredient.nameClean || this.extractIngredientName(ingredient.original || ingredient.item);
                        const hasIt = ingredient.have !== undefined ? ingredient.have : this.hasIngredient(ingredientName);
                        const amount = ingredient.amount || ingredient.original || '1 portion';

                        return `
                        <li>
                            <span>${this.escapeHtml(amount)} ${this.escapeHtml(ingredientName)}</span>
                            <span class="${hasIt ? 'ingredient-have' : 'ingredient-missing'}">
                                ${hasIt ? '✅ Have' : '❌ Missing'}
                            </span>
                        </li>
                        `;
                    }).join('') : '<li>No ingredients available</li>'}
                </ul>
            </div>

            <div class="instructions-section">
                <h3>👩‍🍳 Instructions</h3>
                ${instructions.length > 0 ? `
                    <ol class="instructions-list">
                        ${instructions.map((step, index) => {
                            const stepText = typeof step === 'string' ? step : step.step;
                            return `<li>${this.escapeHtml(stepText)}</li>`;
                        }).join('')}
                    </ol>
                ` : '<p>No instructions available</p>'}
            </div>

            ${recipe.tips ? `
                <div class="tips-section">
                    <h3>💡 Cooking Tips</h3>
                    <p>${this.escapeHtml(recipe.tips)}</p>
                </div>
            ` : ''}

            ${recipe.nutritionInfo ? `
                <div class="nutrition-section">
                    <h3>📊 Nutrition Info</h3>
                    <div class="nutrition-grid">
                        ${recipe.nutritionInfo.calories ? `<div><strong>Calories:</strong> ${recipe.nutritionInfo.calories}</div>` : ''}
                        ${recipe.nutritionInfo.protein ? `<div><strong>Protein:</strong> ${recipe.nutritionInfo.protein}</div>` : ''}
                        ${recipe.nutritionInfo.carbs ? `<div><strong>Carbs:</strong> ${recipe.nutritionInfo.carbs}</div>` : ''}
                    </div>
                </div>
            ` : ''}
        `;
    }

    hasIngredient(ingredientName) {
        if (!ingredientName) return false;
        const cleanName = ingredientName.toLowerCase().trim();

        return this.ingredients.some(ingredient => {
            const cleanIngredient = ingredient.toLowerCase().trim();

            // Exact match
            if (cleanName === cleanIngredient) return true;

            // Check if ingredient name contains our pantry ingredient
            if (cleanName.includes(cleanIngredient) && cleanIngredient.length > 2) return true;

            // Check if our pantry ingredient contains the recipe ingredient
            if (cleanIngredient.includes(cleanName) && cleanName.length > 2) return true;

            return false;
        });
    }

    stripHTML(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    clearOldDalleRecipes() {
        // Check if any recipes have old DALL-E URLs
        const hasOldRecipes = this.currentRecipes.some(recipe => 
            (recipe.imageUrl && recipe.imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net')) ||
            (recipe.image && recipe.image.includes('oaidalleapiprodscus.blob.core.windows.net'))
        );

        if (hasOldRecipes) {
            console.log('🧹 Clearing old recipes with DALL-E URLs to use new local storage system');
            this.currentRecipes = [];
            this.saveRecipesToStorage([]);
            this.displayRecipes([]);
            
            // Show a message to the user
            this.showNotification('Old recipes cleared. Generate new recipes to see images!', 'info');
        }
    }

    getRecipeImageUrl(recipe) {
        // Check for local image URLs first (new system)
        if (recipe.imageUrl && recipe.imageUrl !== '') {
            // If it's a local upload URL, use it directly
            if (recipe.imageUrl.startsWith('/uploads/')) {
                const localUrl = `${CONFIG.API.BASE_URL}${recipe.imageUrl}`;
                console.log(`🖼️ Using local stored image for "${recipe.title}": ${localUrl}`);
                return localUrl;
            }
            // If it's a DALL-E URL (legacy), use our backend proxy
            if (recipe.imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net')) {
                // Extract the full path after /private/ from DALL-E URL
                const urlParts = recipe.imageUrl.split('/private/');
                if (urlParts.length > 1) {
                    const imagePath = urlParts[1];
                    const proxyUrl = `${CONFIG.API.BASE_URL}/images/proxy/${imagePath}`;
                    console.log(`🖼️ Using DALL-E 3 generated image via proxy for "${recipe.title}": ${proxyUrl}`);
                    return proxyUrl;
                }
            }
            console.log(`🖼️ Using DALL-E 3 generated image for "${recipe.title}": ${recipe.imageUrl}`);
            return recipe.imageUrl;
        }

        // Check for legacy image field
        if (recipe.image && recipe.image !== '') {
            // If it's a local upload URL, use it directly
            if (recipe.image.startsWith('/uploads/')) {
                const localUrl = `${CONFIG.API.BASE_URL}${recipe.image}`;
                console.log(`🖼️ Using local stored image for "${recipe.title}": ${localUrl}`);
                return localUrl;
            }
            // If it's a DALL-E URL (legacy), use our backend proxy
            if (recipe.image.includes('oaidalleapiprodscus.blob.core.windows.net')) {
                // Extract the full path after /private/ from DALL-E URL
                const urlParts = recipe.image.split('/private/');
                if (urlParts.length > 1) {
                    const imagePath = urlParts[1];
                    const proxyUrl = `${CONFIG.API.BASE_URL}/images/proxy/${imagePath}`;
                    console.log(`🖼️ Using AI-generated image via proxy for "${recipe.title}": ${proxyUrl}`);
                    return proxyUrl;
                }
            }
            console.log(`🖼️ Using AI-generated image for "${recipe.title}": ${recipe.image}`);
            return recipe.image;
        }

        // Fallback to placeholder if no image provided
        const title = recipe.title || 'Recipe';
        const fallbackUrl = `https://via.placeholder.com/400x300/667eea/ffffff?text=${encodeURIComponent(title.substring(0, 20))}`;
        console.log(`📷 Using placeholder for "${recipe.title}": ${fallbackUrl}`);
        return fallbackUrl;
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash) % 1000;
    }

    cleanTitleForImage(title, cuisine) {
        // Remove special characters and get key food terms
        let searchTerm = title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\b(recipe|easy|quick|simple|homemade|best)\b/g, '') // Remove common recipe words
            .trim()
            .split(' ')
            .slice(0, 2) // Take first 2 words
            .join(',');

        // Add cuisine type if available
        if (cuisine && cuisine !== '') {
            searchTerm += ',' + cuisine.toLowerCase();
        }

        return searchTerm || 'food';
    }

    extractIngredientName(originalText) {
        // Extract main ingredient name from strings like "2 cups chicken breast, diced"
        if (!originalText) return '';

        // Remove quantities (numbers and common units)
        let cleaned = originalText.toLowerCase()
            .replace(/^\d+\.?\d*\s*(cups?|tbsp?|tsp?|lbs?|oz|g|kg|ml|l|pinch|dash|cloves?|pieces?|slices?)\s+/i, '')
            .replace(/\(.*?\)/g, '') // Remove parentheses content
            .replace(/,.*$/, '') // Remove everything after first comma
            .trim();

        // Get the first 1-2 words (usually the main ingredient)
        const words = cleaned.split(/\s+/);
        return words.slice(0, 2).join(' ');
    }

    // Modal Management
    showModal() {
        const modal = document.getElementById('recipe-modal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('recipe-modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // UI Updates
    updateUI() {
        this.updateIngredientsList();
        this.updateSearchButton();
    }

    updateIngredientsList() {
        const ingredientsList = document.getElementById('ingredients-list');

        if (this.ingredients.length === 0) {
            ingredientsList.innerHTML = '';
            return;
        }

        ingredientsList.innerHTML = this.ingredients.map(ingredient => `
            <div class="ingredient-tag">
                <span>${ingredient}</span>
                <button class="remove-btn" onclick="app.removeIngredient('${ingredient}')" title="Remove ${ingredient}">
                    ×
                </button>
            </div>
        `).join('');
    }

    updateSearchButton() {
        const searchBtn = document.getElementById('search-recipes-btn');
        searchBtn.disabled = this.ingredients.length === 0;

        if (this.ingredients.length === 0) {
            searchBtn.textContent = '🔍 Add ingredients to search';
        } else {
            searchBtn.textContent = `🔍 Find Recipes (${this.ingredients.length} ingredients)`;
        }
    }

    // State Management
    showLoading(message = 'Loading...') {
        const loading = document.getElementById('loading');
        const loadingText = loading.querySelector('p');
        if (loadingText) {
            loadingText.textContent = message;
        }
        loading.style.display = 'block';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        loading.style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('error-message');
        const errorText = errorElement.querySelector('p');
        if (errorText) {
            errorText.textContent = message;
        }
        errorElement.style.display = 'block';

        // Auto-hide error after 5 seconds
        setTimeout(() => this.hideError(), 5000);
    }

    hideError() {
        const errorElement = document.getElementById('error-message');
        errorElement.style.display = 'none';
    }

    showSuccess(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1000;
            animation: fadeIn 0.3s ease-in;
        `;
        successDiv.textContent = message;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    showWarning(message) {
        // Create temporary warning message
        const warningDiv = document.createElement('div');
        warningDiv.className = 'warning-message';
        warningDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ed8936;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 1000;
            animation: fadeIn 0.3s ease-in;
        `;
        warningDiv.textContent = message;

        document.body.appendChild(warningDiv);

        setTimeout(() => {
            warningDiv.remove();
        }, 4000);
    }

    getUserPreferences() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE.PREFERENCES);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            return {};
        }
    }

    saveUserPreferences(preferences) {
        try {
            localStorage.setItem(CONFIG.STORAGE.PREFERENCES, JSON.stringify(preferences));
        } catch (error) {
            console.warn('Failed to save preferences:', error);
        }
    }

    // Local Storage
    saveIngredientsToStorage() {
        try {
            localStorage.setItem(CONFIG.STORAGE.INGREDIENTS, JSON.stringify(this.ingredients));
        } catch (error) {
            console.warn('Failed to save ingredients to localStorage:', error);
        }
    }

    loadIngredientsFromStorage() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE.INGREDIENTS);
            if (saved) {
                this.ingredients = JSON.parse(saved);
                console.log('📦 Loaded ingredients from storage:', this.ingredients);
            }
        } catch (error) {
            console.warn('Failed to load ingredients from localStorage:', error);
            this.ingredients = [];
        }
    }

    saveRecipesToStorage(recipes) {
        try {
            localStorage.setItem(CONFIG.STORAGE.RECIPES, JSON.stringify(recipes));
            console.log('💾 Saved recipes to storage:', recipes.length, 'recipes');
        } catch (error) {
            console.warn('Failed to save recipes to localStorage:', error);
        }
    }

    loadRecipesFromStorage() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE.RECIPES);
            if (saved) {
                this.currentRecipes = JSON.parse(saved);
                console.log('📦 Loaded recipes from storage:', this.currentRecipes.length, 'recipes');
                return this.currentRecipes;
            }
        } catch (error) {
            console.warn('Failed to load recipes from localStorage:', error);
            this.currentRecipes = [];
        }
        return [];
    }

    // Lazy Loading Implementation
    initializeLazyLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-load');
                        img.classList.add('loaded');
                        observer.unobserve(img);
                        
                        console.log('🖼️ Lazy loaded image:', img.src);
                    }
                });
            }, {
                rootMargin: '50px 0px', // Start loading 50px before image comes into view
                threshold: 0.1
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            lazyImages.forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy-load');
                img.classList.add('loaded');
            });
        }
    }

    // Utility Functions
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    handleIngredientInput(e) {
        const value = e.target.value.trim();
        if (value.length > 2) {
            // Could implement ingredient suggestions here
            console.log('🔍 Ingredient input:', value);
        }
    }

    // Enhanced Error Handling
    showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
    }

    showSuccess(message) {
        this.showNotification(message, 'success', 3000);
    }

    showError(message) {
        this.showNotification(message, 'error', 7000);
    }

    showWarning(message) {
        this.showNotification(message, 'warning', 5000);
    }

    showInfo(message) {
        this.showNotification(message, 'info', 4000);
    }

    // Save Recipe Method (called from button)
    saveRecipeFromButton(button) {
        const recipeTitle = button.getAttribute('data-recipe-title');
        const recipeData = JSON.parse(button.getAttribute('data-recipe-data'));
        this.saveRecipe(recipeTitle, recipeData);
    }

    // Save Recipe Method
    async saveRecipe(recipeTitle, recipeData) {
        try {
            // Check if user is logged in
            if (!window.authManager || !window.authManager.isLoggedIn()) {
                this.showError('Please sign in to save recipes');
                return;
            }

            // Check if recipe is already saved
            console.log('🔍 Checking if recipe is already saved:', recipeTitle);
            const checkResult = await window.savedRecipesAPI.checkIfSaved(recipeTitle);
            console.log('🔍 Check result:', checkResult);
            
            if (checkResult.data.isSaved) {
                console.log('⚠️ Recipe already saved, showing warning');
                this.showWarning('Recipe is already saved!');
                this.updateSaveButton(recipeTitle, true);
                return;
            }

            // Save the recipe
            const result = await window.savedRecipesAPI.saveRecipe(recipeData);
            
            if (result.success) {
                this.showSuccess('Recipe saved successfully! 💾');
                
                // Update the save button to show it's saved
                this.updateSaveButton(recipeTitle, true);
            } else {
                // Check if it's a duplicate error
                if (result.error && result.error.includes('already saved')) {
                    this.showWarning('Recipe is already saved!');
                    this.updateSaveButton(recipeTitle, true);
                } else {
                    this.showError(result.error || 'Failed to save recipe');
                }
            }
        } catch (error) {
            console.error('Error saving recipe:', error);
            this.showError('Failed to save recipe. Please try again.');
        }
    }

    // Update save button state
    updateSaveButton(recipeTitle, isSaved) {
        const saveButtons = document.querySelectorAll('.save-recipe-btn');
        saveButtons.forEach(button => {
            if (button.getAttribute('data-recipe-title') === recipeTitle) {
                if (isSaved) {
                    button.innerHTML = '✅ Saved';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-success');
                    button.disabled = true;
                } else {
                    button.innerHTML = '💾 Save';
                    button.classList.remove('btn-success');
                    button.classList.add('btn-primary');
                    button.disabled = false;
                }
            }
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RecipeFinderApp();
    
    // Make auth manager available globally
    window.authManager = authManager;
});