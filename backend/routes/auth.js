const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getSupabaseClient, isSupabaseConfigured } = require('../services/supabaseClient');

const router = express.Router();

router.post('/signup', async (req, res) => {
    try {
        if (!isSupabaseConfigured()) {
            return res.status(503).json({ success: false, error: 'Supabase not configured' });
        }

        const { email, password, fullName } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const supabase = getSupabaseClient();
        const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        const { data, error } = await supabase
            .from('users')
            .insert({ email, password_hash: passwordHash, full_name: fullName || null })
            .select('id, email, full_name')
            .single();

        if (error) {
            if (error.message && error.message.includes('duplicate')) {
                return res.status(409).json({ success: false, error: 'Email already registered' });
            }
            return res.status(500).json({ success: false, error: error.message });
        }

        const token = jwt.sign({ userId: data.id, email: data.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

        res.json({ success: true, data: { user: data, token } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Signup failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        if (!isSupabaseConfigured()) {
            return res.status(503).json({ success: false, error: 'Supabase not configured' });
        }

        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const supabase = getSupabaseClient();
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

        res.json({ success: true, data: { user: { id: user.id, email: user.email, full_name: user.full_name }, token } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Login failed' });
    }
});

module.exports = router;


