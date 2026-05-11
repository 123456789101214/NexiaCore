import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 💡 PRO FIX: User Isolation & Verification
            const user = await User.findById(decoded.id).select('-password');
            if (!user) {
                return res.status(401).json({ error: 'User no longer exists' });
            }
            if (user.isActive === false) {
                return res.status(403).json({ error: 'Account suspended. Contact your administrator.' });
            }
            // shopId existence ද verify කරන්න
            if (!user.shopId) {
                return res.status(403).json({ error: 'No shop assigned to this account' });
            }

            req.user = user;
            return next();
        } catch (error) {
            return res.status(401).json({ success: false, error: 'Not authorized, token failed' });
        }
    }

    return res.status(401).json({ success: false, error: 'Not authorized, no token' });
};

// 🛡️ FACTORY PATTERN: මෙය අනිවාර්යයෙන්ම function එකක් return කළ යුතුයි
// server/middleware/authMiddleware.js
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ success: false, error: 'Access denied: No role assigned' });
        }
        
        // Convert to lowercase to prevent 'Owner' vs 'owner' issues
        const userRole = req.user.role.toLowerCase();

        if (!roles.includes(userRole)) {
            return res.status(403).json({ 
                success: false, 
                // මේකෙන් හරියටම ඔයාගේ role එක මොකක්ද කියලා බලාගන්න පුළුවන්
                error: `Access Blocked: Your role '${userRole}' is not authorized.` 
            });
        }
        next();
    };
};