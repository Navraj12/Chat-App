const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model('Message', messageSchema);