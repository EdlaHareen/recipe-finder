-- Supabase Database Setup for Recipe Finder
-- Run this in your Supabase SQL Editor

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create saved_recipes table
CREATE TABLE IF NOT EXISTS saved_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_title VARCHAR(500) NOT NULL,
    recipe_data JSONB NOT NULL,
    ingredients TEXT[],
    cooking_time INTEGER,
    difficulty VARCHAR(50),
    servings INTEGER,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recipe_cache table (for caching AI-generated recipes)
CREATE TABLE IF NOT EXISTS recipe_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ingredients_hash VARCHAR(255) UNIQUE NOT NULL,
    recipe_data JSONB NOT NULL,
    access_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_created_at ON saved_recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_cache_ingredients_hash ON recipe_cache(ingredients_hash);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for saved_recipes table
CREATE POLICY "Users can view their own saved recipes" ON saved_recipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved recipes" ON saved_recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved recipes" ON saved_recipes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved recipes" ON saved_recipes
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for recipe_cache table (public read access)
CREATE POLICY "Anyone can read recipe cache" ON recipe_cache
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert recipe cache" ON recipe_cache
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update recipe cache" ON recipe_cache
    FOR UPDATE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_recipes_updated_at BEFORE UPDATE ON saved_recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_cache_updated_at BEFORE UPDATE ON recipe_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
