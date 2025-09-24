class SavedRecipesAPI {
    constructor() {
        this.baseURL = 'http://localhost:3001/api/saved-recipes';
    }

    async buildHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add authentication header if user is logged in
        let token = null;
        
        // Try to get token from auth manager first
        if (window.authManager && window.authManager.isLoggedIn()) {
            token = window.authManager.getToken();
        }
        
        // Fallback: check localStorage directly
        if (!token) {
            const userData = localStorage.getItem('recipe_finder_user_data');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    token = parsed.token;
                } catch (e) {
                    console.warn('Failed to parse user data from localStorage');
                }
            }
        }
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    async saveRecipe(recipe) {
        try {
            const headers = await this.buildHeaders();
            
            const response = await fetch(`${this.baseURL}/save`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ recipe })
            });

            const result = await response.json();
            
            if (!response.ok) {
                // Handle 409 (Conflict) as a special case for duplicate recipes
                if (response.status === 409) {
                    return {
                        success: false,
                        error: 'Recipe already saved'
                    };
                }
                throw new Error(result.error || 'Failed to save recipe');
            }

            return result;
        } catch (error) {
            console.error('Error saving recipe:', error);
            throw error;
        }
    }

    async getMyRecipes(page = 1, limit = 10) {
        try {
            const headers = await this.buildHeaders();
            
            const response = await fetch(`${this.baseURL}/my-recipes?page=${page}&limit=${limit}`, {
                method: 'GET',
                headers
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch saved recipes');
            }

            return result;
        } catch (error) {
            console.error('Error fetching saved recipes:', error);
            throw error;
        }
    }

    async deleteRecipe(recipeId) {
        try {
            const headers = await this.buildHeaders();
            
            const response = await fetch(`${this.baseURL}/${recipeId}`, {
                method: 'DELETE',
                headers
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete recipe');
            }

            return result;
        } catch (error) {
            console.error('Error deleting recipe:', error);
            throw error;
        }
    }

    async checkIfSaved(recipeTitle) {
        try {
            const headers = await this.buildHeaders();
            
            const response = await fetch(`${this.baseURL}/check/${encodeURIComponent(recipeTitle)}`, {
                method: 'GET',
                headers
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to check recipe status');
            }

            return result;
        } catch (error) {
            console.error('Error checking recipe status:', error);
            throw error;
        }
    }
}

// Create global instance
window.savedRecipesAPI = new SavedRecipesAPI();
