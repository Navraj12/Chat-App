import { Schema, model } from 'mongoose';

const messageSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    room: {
        type: String,
        default: 'general'
    }
}, {
    timestamps: true
});

export default model('Message', messageSchema);
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
        const user = await User.findOne({ email });
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
        const messages = await Message.find()
            .sort({ createdAt: 1 })
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
        const users = await User.find({ online: true }).select('username _id');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;