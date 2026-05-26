import express from 'express';
import dotenv from 'dotenv';
import colors from 'colors';
import cors from 'cors';
import dns from 'dns';
import connectDB from './config/db.js';
import helmet from 'helmet';
import morgan from 'morgan';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import grnRoutes from './routes/grnRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import shopRoutes from './routes/shopRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import staffRoutes from './routes/staffRoutes.js';

dotenv.config();

// ── IPv4 FIRST: Must run before ANY DNS lookup (Railway/Render fix) ──
// dns.setDefaultResultOrder('ipv4first');

// Fix DNS resolution issues (common in some Sri Lankan ISPs)
if (process.env.NODE_ENV !== 'production') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

app.use(helmet());
// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',           // 💻 Local Development වලට
        'https://app.nexiacore.shop',   // 🚀 Vercel Production Link එක (අගට / දාන්න එපා)
        process.env.CLIENT_URL             // (Optional) Railway එකෙන් Variable එකක් දුන්නොත්
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: "OK",
        uptime: process.uptime(),
        timestamp: new Date(),
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/staff', staffRoutes);

// ❗ 404 handler (after routes)
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
    });
});

// ❗ Error handler (LAST middleware)
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

// ✅ Controlled startup
const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(
                `🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
            );
        });

    } catch (error) {
        console.error(`Server failed: ${error.message}`.red.bold);
        process.exit(1);
    }
};

startServer();