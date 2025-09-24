require('dotenv').config();
const { getSupabaseClient, isSupabaseConfigured } = require('./services/supabaseClient');

async function setupDatabase() {
    try {
        console.log('🔧 Setting up Supabase database...');
        
        if (!isSupabaseConfigured()) {
            console.error('❌ Supabase not configured. Please check your environment variables.');
            return;
        }

        const supabase = getSupabaseClient();
        if (!supabase) {
            console.error('❌ Failed to create Supabase client.');
            return;
        }

        console.log('✅ Supabase client created successfully');

        // Test connection
        console.log('🔍 Testing Supabase connection...');
        const { data, error } = await supabase.from('users').select('count');
        
        if (error) {
            console.log('⚠️  Users table might not exist yet:', error.message);
        } else {
            console.log('✅ Users table exists');
        }

        // Check if saved_recipes table exists
        console.log('🔍 Checking saved_recipes table...');
        const { data: recipesData, error: recipesError } = await supabase.from('saved_recipes').select('count');
        
        if (recipesError) {
            console.log('❌ saved_recipes table does not exist:', recipesError.message);
            console.log('📝 Please run the SQL script in your Supabase dashboard:');
            console.log('   1. Go to your Supabase project dashboard');
            console.log('   2. Navigate to SQL Editor');
            console.log('   3. Run the contents of supabase_setup.sql');
        } else {
            console.log('✅ saved_recipes table exists');
        }

        // Check if recipe_cache table exists
        console.log('🔍 Checking recipe_cache table...');
        const { data: cacheData, error: cacheError } = await supabase.from('recipe_cache').select('count');
        
        if (cacheError) {
            console.log('❌ recipe_cache table does not exist:', cacheError.message);
        } else {
            console.log('✅ recipe_cache table exists');
        }

    } catch (error) {
        console.error('❌ Database setup error:', error);
    }
}

setupDatabase();
