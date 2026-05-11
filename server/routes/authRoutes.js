import express from 'express';
// 💡 අලුතින් හදපු sendOtp සහ verifyOtp මෙතනට Import කරගන්න
import { register, login, registerStaff, sendOtp, verifyOtp } from '../controllers/authController.js'; 
import rateLimit from 'express-rate-limit';
import { protect, authorize } from '../middleware/authMiddleware.js'; 

// 💡 ඔයාගේ Plan Limits හදලා ඉවර වුණාම මේක Uncomment කරගන්න
// import { checkUserLimit } from '../middleware/planMiddleware.js';

const router = express.Router();

// -------------------------------------------------------------------------
// 🛡️ SECURITY: Rate Limiters
// -------------------------------------------------------------------------

// Brute-Force Protection for Login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // විනාඩි 15යි
    max: 10,                  // උපරිම උත්සාහයන් 10යි
    message: { 
        success: false, 
        error: 'Too many login attempts. Please try again in 15 minutes.' 
    }
});

// Spam Protection for OTP (New)
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // විනාඩි 15යි
    max: 5,                   // උපරිම OTP ඉල්ලීම් 5යි
    message: { success: false, error: 'Too many OTP requests. Please try again later.' }
});

// -------------------------------------------------------------------------
// 🔓 PUBLIC ROUTES (මේවා Token එකක් නැතුව වැඩ කරන්න ඕනේ)
// -------------------------------------------------------------------------

// 🛡️ NEW: OTP Verification Routes
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);

// Register a new Shop and Owner (Root of Tenant)
router.post('/register', register);

// Authenticate User
router.post('/login', loginLimiter, login);


// -------------------------------------------------------------------------
// 🔒 PROTECTED ROUTES (මේවා Token එකත් එක්ක වැඩ කරන්න ඕනේ)
// -------------------------------------------------------------------------

// Register a new staff member (Only Owners can do this)
router.post('/register-staff', protect, authorize('owner', 'admin'), registerStaff);

export default router;