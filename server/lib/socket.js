import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from './logger.js';

let io = null;

/**
 * Initialise Socket.IO on an existing HTTP server.
 * Call once in server/index.js after `app.listen()`.
 */
export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN
                ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
                : '*',
            credentials: true,
        },
        // Limit payload size to prevent abuse
        maxHttpBufferSize: 64 * 1024,
        pingTimeout: 20_000,
        pingInterval: 25_000,
    });

    // -------------------------------------------------------------------------
    // Auth middleware — verify JWT from handshake
    // -------------------------------------------------------------------------
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Authentication required'));

        const secret = process.env.JWT_SECRET;
        if (!secret) return next(new Error('Server misconfiguration'));

        try {
            const payload = jwt.verify(token, secret);
            socket.data.userId = payload.userId ?? payload.sub ?? payload.id;
            if (!socket.data.userId) return next(new Error('Invalid token payload'));
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    // -------------------------------------------------------------------------
    // Connection handler
    // -------------------------------------------------------------------------
    io.on('connection', (socket) => {
        const { userId } = socket.data;
        logger.info({ userId, socketId: socket.id }, 'ws:connected');

        // Join a private room for targeted server→client pushes
        socket.join(`user:${userId}`);

        // --- Presence -----------------------------------------------------------
        socket.on('presence:online', () => {
            socket.broadcast.emit('presence:update', { userId, online: true });
        });

        socket.on('disconnect', (reason) => {
            logger.info({ userId, socketId: socket.id, reason }, 'ws:disconnected');
            socket.broadcast.emit('presence:update', { userId, online: false });
        });
    });

    logger.info('Socket.IO initialised');
    return io;
}

/**
 * Get the active Socket.IO server instance.
 * Returns null if not yet initialised.
 */
export function getIO() {
    return io;
}

/**
 * Emit a notification event to a specific user's room.
 */
export function emitToUser(userId, event, data) {
    if (!io) return;
    io.to(`user:${userId}`).emit(event, data);
}
