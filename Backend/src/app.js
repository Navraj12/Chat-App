import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import express from 'express';
import { connect } from 'mongoose';
import { WebSocketServer } from 'ws';
const app = express();

const connectDB = async() => {
    try {
        await connect(process.env.MONGODB_URI);
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB;
// eServer(app);
// Create an HTTP server from Express
import http from 'http';
import WebSocket from 'ws';
import Message from './models/message.js';
import User from './models/user.js';
import authRoutes from './routes/auth.js';
import { verifyToken } from './utils/jwt.js';
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Store connected clients
const clients = new Map();

// WebSocket connection handler
wss.on('connection', async(ws, req) => {
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

                        // Update user online status
                        await User.findByIdAndUpdate(user._id, { online: true });

                        // Send success message
                        ws.send(JSON.stringify({
                            type: 'auth_success',
                            user: {
                                id: user._id,
                                username: user.username
                            }
                        }));

                        // Broadcast online users
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

                // Broadcast message to all clients
                const broadcastMessage = {
                    type: 'chat_message',
                    data: {
                        _id: newMessage._id,
                        user: ws.userId,
                        username: ws.username,
                        content: newMessage.content,
                        createdAt: newMessage.createdAt
                    }
                };

                broadcast(broadcastMessage);
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

            // Update user online status
            await User.findByIdAndUpdate(ws.userId, { online: false });

            console.log(`User disconnected: ${ws.username}`);

            // Broadcast updated online users
            broadcastOnlineUsers();
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Broadcast message to all connected clients
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

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});