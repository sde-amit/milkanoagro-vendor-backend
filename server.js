const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const rateLimiter = require('./middleware/rateLimiter');

// Import database connection
const { connectDB } = require('./config/database');

// Import socket handlers
const socketHandler = require('./socket/socketHandler');

// Import cleanup service
const CleanupService = require('./services/cleanupService');

// Import logger
const Logger = require('./utils/logger');

const app = express();
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: [
            "https://milkanoagro-vendor-xtvq.vercel.app",
            "https://api.brightlayer.in",
            "http://localhost:3000",
            "http://localhost:5173"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Connect to database
connectDB();

// Middleware
app.use(cors({
    origin: [
        "https://milkanoagro-vendor-xtvq.vercel.app",
        "https://api.brightlayer.in",
        "http://localhost:3000",
        "http://localhost:5173"
    ],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('dev'));
}

// Rate limiting
app.use('/api/', rateLimiter);

// Make io accessible to routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'BrightLayer API Server',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            vendor: '/api/vendor',
            upload: '/api/upload',
            admin: '/api/admin'
        },
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

socketHandler(io);

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // Handle React routing for non-API routes
    app.get(/^(?!\/api).*/, (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
    });
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3409;

server.listen(PORT, () => {
    Logger.success(`Server running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
    CleanupService.startPeriodicCleanup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    Logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        Logger.info('Process terminated');
    });
});

module.exports = { app, server, io };