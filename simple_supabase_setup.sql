-- Simple Supabase Setup for Recipe Finder
-- Run this in your Supabase SQL Editor

-- First, create the saved_recipes table
CREATE TABLE saved_recipes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX idx_saved_recipes_created_at ON saved_recipes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own saved recipes" ON saved_recipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved recipes" ON saved_recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved recipes" ON saved_recipes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved recipes" ON saved_recipes
    FOR DELETE USING (auth.uid() = user_id);
