/* ============================================================
   DATABASE CONFIGURATION
   MongoDB connection setup with Mongoose
   ============================================================ */

const mongoose = require('mongoose');

// Connection options
const connectionOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4 // Use IPv4, skip trying IPv6
};

// Connection state tracking
let isConnected = false;

// Connect to MongoDB
async function connectDB() {
    if (isConnected) {
        console.log('[Database] Using existing connection');
        return mongoose.connection;
    }

    try {
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        // Connect to MongoDB
        await mongoose.connect(mongoURI, connectionOptions);

        isConnected = true;

        console.log('[Database] MongoDB connected successfully');

        // Connection event handlers
        mongoose.connection.on('connected', () => {
            console.log('[Database] Mongoose connected to MongoDB');
        });

        mongoose.connection.on('error', (err) => {
            console.error('[Database] Mongoose connection error:', err.message);
            isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.log('[Database] Mongoose disconnected from MongoDB');
            isConnected = false;
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('[Database] Connection closed on app termination');
            process.exit(0);
        });

        return mongoose.connection;

    } catch (error) {
        console.error('[Database] Connection failed:', error.message);
        // Retry logic could be added here
        throw error;
    }
}

// Disconnect from database
async function disconnectDB() {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        isConnected = false;
        console.log('[Database] Disconnected from MongoDB');
    }
}

// Get connection status
function getConnectionStatus() {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = {
    connectDB,
    disconnectDB,
    getConnectionStatus,
    connection: mongoose.connection
};
