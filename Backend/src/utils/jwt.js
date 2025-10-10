import pkg from 'jsonwebtoken';
const { sign, verify } = pkg;

const generateToken = (userId) => {
    return sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

const verifyToken = (token) => {
    try {
        return verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

export default { generateToken, verifyToken };