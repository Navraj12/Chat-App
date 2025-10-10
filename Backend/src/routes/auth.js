import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { Message } from '../models/message.js';
import { create, find, findOne } from '../models/user.js';
import { generateToken } from '../utils/jwt.js';

const router = Router();

// Register
router.post('/register', async(req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists
        const existingUser = await findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await create({ username, email, password });
        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login
router.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get current user
router.get('/me', authMiddleware, async(req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

// Get messages
router.get('/messages', authMiddleware, async(req, res) => {
    try {
        const messages = await _find()
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('user', 'username');

        res.json(messages.reverse());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get online users
router.get('/users/online', authMiddleware, async(req, res) => {
    try {
        const users = await find({ online: true }).select('username _id');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;