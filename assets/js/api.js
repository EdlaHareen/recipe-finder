// AI-Powered Recipe Finder API Layer
class RecipeAPI {
    constructor() {
        this.baseUrl = CONFIG.API.BASE_URL;
        this.sessionId = this.getOrCreateSessionId();
        this.checkBackendConnection();
    }

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem(CONFIG.STORAGE.SESSION_ID);
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            localStorage.setItem(CONFIG.STORAGE.SESSION_ID, sessionId);
        }
        return sessionId;
    }

    async checkBackendConnection() {
        try {
            console.log('🔄 Checking backend connection...');
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);

            if (response.ok) {
                const data = await response.json();
                console.log('🚀 Connected to AI-powered backend:', data);
                this.backendConnected = true;
                return true;
            } else {
                console.warn('⚠️ Backend connection issues - Status:', response.status);
                this.backendConnected = false;
                return false;
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
            console.warn('⚠️ Backend not available, using fallback mode');
            this.backendConnected = false;
            return false;
        }
    }

    buildHeaders() {
        return {
            'Content-Type': 'application/json',
            'X-Session-ID': this.sessionId
        };
    }

    async makeRequest(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const defaultOptions = {
                headers: this.buildHeaders(),
                ...options
            };

            console.log(`🌐 Making API request to: ${url}`);

            const response = await fetch(url, defaultOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('✅ API response received:', data);
            return data;

        } catch (error) {
            console.error('❌ API request failed:', error);
            return {
                success: false,
                error: error.message,
                isNetworkError: !navigator.onLine
            };
        }
    }

    async generateRecipesByIngredients(ingredients, options = {}) {
        if (!ingredients || ingredients.length === 0) {
            return { success: false, error: 'No ingredients provided' };
        }

        // Re-check backend connection if it was previously failed
        if (!this.backendConnected) {
            console.log('🔄 Backend was disconnected, re-checking connection...');
            await this.checkBackendConnection();
        }

        if (!this.backendConnected) {
            console.log('🔧 Using fallback recipes - backend not available');
            return this.getFallbackRecipes(ingredients);
        }

        const payload = {
            ingredients,
            count: options.count || CONFIG.APP.DEFAULT_RECIPE_COUNT,
            dietaryRestrictions: options.dietaryRestrictions || [],
            cuisineType: options.cuisineType || '',
            difficulty: options.difficulty || '',
            cookingTime: options.cookingTime || '',
            servings: options.servings || 4
        };

        return await this.makeRequest(CONFIG.API.ENDPOINTS.GENERATE_RECIPES, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async analyzeIngredientImage(imageFile) {
        if (!imageFile) {
            return { success: false, error: 'No image file provided' };
        }

        if (!this.backendConnected) {
            return this.getFallbackImageAnalysis(imageFile);
        }

        // Check file size
        if (imageFile.size > CONFIG.APP.IMAGE_MAX_SIZE) {
            const maxSizeMB = CONFIG.APP.IMAGE_MAX_SIZE / (1024 * 1024);
            return {
                success: false,
                error: `Image too large. Maximum size is ${maxSizeMB}MB`
            };
        }

        // Check file type
        const fileExtension = imageFile.name.split('.').pop()?.toLowerCase();
        if (!CONFIG.APP.ALLOWED_IMAGE_TYPES.includes(fileExtension)) {
            return {
                success: false,
                error: `File type not supported. Allowed types: ${CONFIG.APP.ALLOWED_IMAGE_TYPES.join(', ')}`
            };
        }

        try {
            const formData = new FormData();
            formData.append('image', imageFile);

            const response = await fetch(`${this.baseUrl}${CONFIG.API.ENDPOINTS.ANALYZE_IMAGE}`, {
                method: 'POST',
                headers: {
                    'X-Session-ID': this.sessionId
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Image analysis failed');
            }

            return data;

        } catch (error) {
            console.error('Image analysis error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getRecipeDetails(recipeId) {
        if (!recipeId) {
            return { success: false, error: 'No recipe ID provided' };
        }

        if (!this.backendConnected) {
            return this.getFallbackRecipeDetails(recipeId);
        }

        return await this.makeRequest(`${CONFIG.API.ENDPOINTS.GET_RECIPE_DETAILS}/${recipeId}`);
    }

    async addToFavorites(recipeId) {
        if (!this.backendConnected) {
            return this.addToLocalFavorites(recipeId);
        }

        const endpoint = CONFIG.API.ENDPOINTS.ADD_FAVORITE.replace('{id}', recipeId);
        return await this.makeRequest(endpoint, {
            method: 'POST'
        });
    }

    async removeFromFavorites(recipeId) {
        if (!this.backendConnected) {
            return this.removeFromLocalFavorites(recipeId);
        }

        const endpoint = CONFIG.API.ENDPOINTS.ADD_FAVORITE.replace('{id}', recipeId);
        return await this.makeRequest(endpoint, {
            method: 'DELETE'
        });
    }

    async getFavoriteRecipes() {
        if (!this.backendConnected) {
            return this.getLocalFavorites();
        }

        return await this.makeRequest(CONFIG.API.ENDPOINTS.FAVORITES);
    }

    async getImageCapabilities() {
        if (!this.backendConnected) {
            return {
                success: true,
                data: {
                    aiAnalysisAvailable: false,
                    maxFileSize: CONFIG.APP.IMAGE_MAX_SIZE,
                    allowedTypes: CONFIG.APP.ALLOWED_IMAGE_TYPES
                }
            };
        }

        return await this.makeRequest(CONFIG.API.ENDPOINTS.IMAGE_CAPABILITIES);
    }

    // Fallback methods for when backend is not available
    getFallbackRecipes(ingredients) {
        console.log('🔧 Using fallback recipe generation');

        const fallbackRecipes = [
            {
                id: `fallback_${Date.now()}_1`,
                title: `${ingredients[0]} Stir Fry`,
                description: `A quick and easy stir fry featuring ${ingredients.slice(0, 3).join(', ')}`,
                cookingTime: 20,
                servings: 4,
                difficulty: 'easy',
                cuisineType: 'asian',
                dietaryTags: [],
                ingredients: [
                    ...ingredients.map(ing => ({ item: ing, amount: '1 cup', have: true })),
                    { item: 'oil', amount: '2 tbsp', have: false },
                    { item: 'soy sauce', amount: '3 tbsp', have: false }
                ],
                instructions: [
                    'Heat oil in a large pan or wok',
                    `Add ${ingredients.join(', ')} and stir fry for 5-7 minutes`,
                    'Add soy sauce and cook for 2 more minutes',
                    'Serve hot'
                ],
                aiGenerated: false,
                fallback: true
            }
        ];

        return { success: true, data: fallbackRecipes };
    }

    getFallbackImageAnalysis(imageFile) {
        console.log('🔧 Using fallback image analysis');

        // Simple fallback based on filename
        const fileName = imageFile.name.toLowerCase();
        const commonIngredients = [
            'tomato', 'potato', 'onion', 'carrot', 'apple', 'banana',
            'chicken', 'beef', 'rice', 'pasta', 'cheese', 'bread'
        ];

        const detected = commonIngredients.find(ingredient =>
            fileName.includes(ingredient)
        ) || commonIngredients[Math.floor(Math.random() * commonIngredients.length)];

        return {
            success: true,
            data: {
                ingredients: [
                    {
                        name: detected,
                        confidence: 0.75,
                        category: 'unknown'
                    }
                ],
                analysis: `Detected possible ${detected} in the image (fallback analysis)`
            },
            fallback: true
        };
    }

    getFallbackRecipeDetails(recipeId) {
        console.log('🔧 Using fallback recipe details');

        return {
            success: true,
            data: {
                id: recipeId,
                title: "Sample Recipe",
                description: "A simple recipe",
                cookingTime: 30,
                servings: 4,
                difficulty: 'medium',
                ingredients: [
                    { item: 'main ingredient', amount: '2 cups', have: true }
                ],
                instructions: [
                    'Prepare ingredients',
                    'Cook according to preference',
                    'Serve and enjoy'
                ]
            },
            fallback: true
        };
    }

    // Local storage fallback methods
    addToLocalFavorites(recipeId) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        if (!favorites.includes(recipeId)) {
            favorites.push(recipeId);
            localStorage.setItem('favorites', JSON.stringify(favorites));
        }
        return { success: true, message: 'Added to local favorites' };
    }

    removeFromLocalFavorites(recipeId) {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        const updatedFavorites = favorites.filter(id => id !== recipeId);
        localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
        return { success: true, message: 'Removed from local favorites' };
    }

    getLocalFavorites() {
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        return { success: true, data: favorites };
    }

    isBackendConnected() {
        return this.backendConnected;
    }
}

// Create global API instance
const recipeAPI = new RecipeAPI();