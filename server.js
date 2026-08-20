/* ============================================================
   PROFESSIONAL ENTERPRISE WEBSITE — BACKEND SERVER
   Handles appointment submissions with WhatsApp notifications
   ============================================================ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const appointmentRoutes = require('./routes/appointments');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ----- Security Middleware -----
app.use(helmet());

// ----- CORS Configuration -----
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

// ----- Rate Limiting -----
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per window
    message: {
        error: 'Too many requests from this IP. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// ----- Body Parser -----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ----- Health Check Route -----
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Enterprise Appointment API is running',
        timestamp: new Date().toISOString()
    });
});

// ----- API Routes -----
app.use('/api/appointments', appointmentRoutes);

// ----- 404 Handler -----
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// ----- Global Error Handler -----
app.use((err, req, res, next) => {
    console.error('[Server Error]', err.stack);

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    // Duplicate key error
    if (err.code === 11000) {
        return res.status(409).json({
            error: 'Duplicate entry',
            field: Object.keys(err.keyPattern)[0]
        });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// ----- Start Server -----
async function startServer() {
    try {
        // Connect to database
        await connectDB();

        app.listen(PORT, () => {
            console.log('[Server] Enterprise Appointment API running');
            console.log('[Server] Port: ' + PORT);
            console.log('[Server] Environment: ' + (process.env.NODE_ENV || 'development'));
            console.log('[Server] Health check: http://localhost:' + PORT + '/health');
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error.message);
        process.exit(1);
    }
}

startServer();

// ----- Graceful Shutdown -----
process.on('SIGINT', () => {
    console.log('[Server] Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('[Server] Shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
