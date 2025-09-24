// Configuration file for Recipe Finder
const CONFIG = {
    // Backend API Configuration
    API: {
        BASE_URL: 'http://localhost:3001/api',

        // API Endpoints
        ENDPOINTS: {
            GENERATE_RECIPES: '/recipes/generate',
            GET_RECIPES: '/recipes',
            GET_RECIPE_DETAILS: '/recipes',
            ANALYZE_IMAGE: '/images/analyze',
            UPLOAD_IMAGE: '/images/upload',
            FAVORITES: '/recipes/user/favorites',
            ADD_FAVORITE: '/recipes/{id}/favorite',
            IMAGE_CAPABILITIES: '/images/capabilities'
        }
    },

    // Local Storage Keys
    STORAGE: {
        INGREDIENTS: 'recipe_finder_ingredients',
        RECIPES: 'recipe_finder_recipes',
        SESSION_ID: 'recipe_finder_session_id',
        PREFERENCES: 'recipe_finder_preferences',
        USER_DATA: 'recipe_finder_user_data'
    },

    // Application Settings
    APP: {
        MAX_INGREDIENTS: 20,
        MIN_INGREDIENTS: 1,
        DEBOUNCE_DELAY: 300,
        DEFAULT_RECIPE_COUNT: 5,
        IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'webp']
    },

    // Recipe Generation Options
    GENERATION: {
        DIETARY_RESTRICTIONS: [
            'vegetarian',
            'vegan',
            'gluten-free',
            'dairy-free',
            'nut-free',
            'low-carb',
            'keto',
            'paleo'
        ],
        CUISINE_TYPES: [
            'italian',
            'chinese',
            'indian',
            'mexican',
            'japanese',
            'american',
            'mediterranean',
            'thai',
            'french'
        ],
        DIFFICULTY_LEVELS: ['easy', 'medium', 'hard'],
        COOKING_TIMES: [15, 30, 45, 60, 90]
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}