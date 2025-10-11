import cors from 'cors';
import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { connectDB } from './config/db.js'; // your MongoDB connection
import Message from './models/message.js';
import User from './models/user.js';
import authRoutes from './routes/authRoutes.js'; // adjust path if needed
import { verifyToken } from './utils/auth.js'; // your JWT verify function

// Initialize Express
const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    ws.on('message', async(data) => {
        try {
            const message = JSON.parse(data);

            // Handle authentication
            if (message.type === 'auth') {
                const decoded = verifyToken(message.token);
                if (decoded) {
                    const user = await User.findById(decoded.id);
                    if (user) {
                        ws.userId = user._id.toString();
                        ws.username = user.username;
                        clients.set(ws.userId, ws);

                        // Update online status
                        await User.findByIdAndUpdate(user._id, { online: true });

                        ws.send(JSON.stringify({
                            type: 'auth_success',
                            user: { id: user._id, username: user.username }
                        }));

                        broadcastOnlineUsers();
                        console.log(`User authenticated: ${user.username}`);
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
                    ws.close();
                }
            }

            // Handle chat messages
            if (message.type === 'chat_message' && ws.userId) {
                const newMessage = await Message.create({
                    user: ws.userId,
                    username: ws.username,
                    content: message.content,
                    room: message.room || 'general'
                });

                broadcast({
                    type: 'chat_message',
                    data: {
                        _id: newMessage._id,
                        user: ws.userId,
                        username: ws.username,
                        content: newMessage.content,
                        createdAt: newMessage.createdAt
                    }
                });
            }

            // Handle typing indicator
            if (message.type === 'typing' && ws.userId) {
                broadcast({
                    type: 'typing',
                    username: ws.username,
                    isTyping: message.isTyping
                }, ws);
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', async() => {
        if (ws.userId) {
            clients.delete(ws.userId);

            // Update online status
            await User.findByIdAndUpdate(ws.userId, { online: false });
            console.log(`User disconnected: ${ws.username}`);

            broadcastOnlineUsers();
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Broadcast message to all clients
function broadcast(message, excludeWs = null) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

// Broadcast online users
async function broadcastOnlineUsers() {
    try {
        const onlineUsers = await User.find({ online: true }).select('username _id');
        broadcast({
            type: 'online_users',
            users: onlineUsers
        });
    } catch (error) {
        console.error('Error broadcasting online users:', error);
    }
}

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));