const express = require('express');
const router = express.Router();
const { getSupabaseClient, isSupabaseConfigured } = require('../services/supabaseClient');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Save a recipe
router.post('/save', authenticateToken, async (req, res) => {
    try {
        const { recipe } = req.body;
        const userId = req.user.userId;

        if (!recipe) {
            return res.status(400).json({ success: false, error: 'Recipe data is required' });
        }

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            return res.status(503).json({ success: false, error: 'Supabase not configured' });
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            return res.status(503).json({ success: false, error: 'Database connection failed' });
        }

        // Check if recipe already exists for this user
        const { data: existingRecipe, error: checkError } = await supabase
            .from('saved_recipes')
            .select('id')
            .eq('user_id', userId)
            .eq('recipe_title', recipe.title)
            .single();

        if (existingRecipe) {
            return res.status(409).json({ 
                success: false, 
                error: 'Recipe already saved' 
            });
        }

        // Save the recipe
        const { data, error } = await supabase
            .from('saved_recipes')
            .insert([
                {
                    user_id: userId,
                    recipe_title: recipe.title,
                    recipe_data: recipe,
                    ingredients: recipe.ingredients || [],
                    cooking_time: recipe.cookingTime || null,
                    difficulty: recipe.difficulty || null,
                    servings: recipe.servings || null,
                    image_url: recipe.imageUrl || null,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) {
            console.error('Error saving recipe:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to save recipe' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Recipe saved successfully',
            data: { savedRecipe: data }
        });

    } catch (error) {
        console.error('Save recipe error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Get user's saved recipes
router.get('/my-recipes', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;

        const offset = (page - 1) * limit;

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            return res.status(503).json({ success: false, error: 'Supabase not configured' });
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            return res.status(503).json({ success: false, error: 'Database connection failed' });
        }

        const { data, error, count } = await supabase
            .from('saved_recipes')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching saved recipes:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch saved recipes' 
            });
        }

        res.json({ 
            success: true, 
            data: { 
                recipes: data || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get saved recipes error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Delete a saved recipe
router.delete('/:recipeId', authenticateToken, async (req, res) => {
    try {
        const { recipeId } = req.params;
        const userId = req.user.userId;

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            return res.status(503).json({ success: false, error: 'Supabase not configured' });
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            return res.status(503).json({ success: false, error: 'Database connection failed' });
        }

        const { error } = await supabase
            .from('saved_recipes')
            .delete()
            .eq('id', recipeId)
            .eq('user_id', userId);

        if (error) {
            console.error('Error deleting saved recipe:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to delete recipe' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Recipe deleted successfully' 
        });

    } catch (error) {
        console.error('Delete saved recipe error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Check if a recipe is saved
router.get('/check/:recipeTitle', authenticateToken, async (req, res) => {
    try {
        const { recipeTitle } = req.params;
        const userId = req.user.userId;

        // Check if Supabase is configured
        if (!isSupabaseConfigured()) {
            return res.status(503).json({ success: false, error: 'Supabase not configured' });
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            return res.status(503).json({ success: false, error: 'Database connection failed' });
        }

        const { data, error } = await supabase
            .from('saved_recipes')
            .select('id')
            .eq('user_id', userId)
            .eq('recipe_title', recipeTitle)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error checking saved recipe:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to check recipe status' 
            });
        }

        res.json({ 
            success: true, 
            data: { 
                isSaved: !!data,
                recipeId: data?.id || null
            }
        });

    } catch (error) {
        console.error('Check saved recipe error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

module.exports = router;
