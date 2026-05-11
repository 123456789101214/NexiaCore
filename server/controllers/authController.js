import mongoose from 'mongoose';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer'; // 💡 NEW: Email sending
import crypto from 'crypto'; // 💡 NEW: Secure OTP generation
import EmailVerification from '../models/EmailVerification.js'; // 💡 NEW: OTP Model

// ━━━ 🛡️ PRO FIX: LAZY LOADED TRANSPORTER ━━━
let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD
            }
        });
    }
    return transporter;
};
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const generateToken = (id, role, shopId) => {
    return jwt.sign({ id, role, shopId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new Shop and Owner
// @route   POST /api/auth/register
export const register = async (req, res) => {
    // ━━━ 🛡️ ALREADY-LOGGED-IN GUARD ━━━
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.JWT_SECRET);
            // Token is valid = User is already logged in to an existing shop
            return res.status(400).json({
                success: false,
                error: 'You are already logged in to a shop. Please log out before registering a new shop.'
            });
        } catch (_) {
            // Token invalid or expired — treat as unauthenticated, allow registration
        }
    }
    // ━━━ END GUARD ━━━

    const { verificationToken, shopName, name, email, password, phone, address, plan } = req.body;

    // ━━━ 🛡️ NEW: EMAIL VERIFICATION GUARD ━━━
    if (!verificationToken) {
        return res.status(400).json({ success: false, error: 'Email verification required before registration.' });
    }
    try {
        const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET);
        if (!decoded.verified || decoded.email !== email.toLowerCase().trim()) {
            return res.status(400).json({ success: false, error: 'Invalid verification token. Please verify your email again.' });
        }
    } catch (_) {
        return res.status(400).json({ success: false, error: 'Verification token expired. Please verify your email again.' });
    }
    // ━━━ END VERIFICATION GUARD ━━━

    // 🛡️ STRICT INPUT VALIDATION (Existing logic kept intact)
    if (!shopName || typeof shopName !== 'string' || shopName.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Shop name must be at least 2 characters' });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    if (phone !== undefined && typeof phone !== 'string') {
        return res.status(400).json({ success: false, error: 'Invalid phone format' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await User.findOne({ email: normalizedEmail }).session(session);
        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Create Shop
        const shop = await Shop.create([{ 
            name: shopName.trim(),
            phone: phone?.trim() || null,
            address: address?.trim() || null,
            subscriptionPlan: ['free', 'pro', 'enterprise'].includes(plan) ? plan : 'free'
        }], { session });

        // Create Owner
        const user = await User.create([{
            name: name.trim(),
            email: normalizedEmail,
            password,
            role: 'owner',
            shopId: shop[0]._id,
            isEmailVerified: true // 💡 Ensure User.js Schema has this field!
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            token: generateToken(user[0]._id, user[0].role, user[0].shopId),
            user: {
                id: user[0]._id,
                name: user[0].name,
                email: user[0].email,
                role: user[0].role,
                shopId: user[0].shopId
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Registration Error:", error);

        let message = 'Registration failed. Please try again.';
        if (error.message.includes('Email already registered')) message = error.message;
        if (error.code === 11000) message = 'Email already registered';

        res.status(400).json({ success: false, error: message });
    }
};

// @desc    Login User
// @route   POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || typeof email !== 'string' || email.trim() === '' ||
            !password || typeof password !== 'string' || password.trim() === '') {
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (user && (await user.matchPassword(password))) {
            
            // ━━━ 🛡️ SECURITY GUARD 1: Block unverified accounts ━━━
            if (user.isEmailVerified === false) {
                return res.status(403).json({
                    success: false,
                    error: 'Email not verified. Please complete registration with a valid email.'
                });
            }

            // ━━━ 🛡️ SECURITY GUARD 2: Block Deactivated (Inactive) accounts ━━━
            // 💡 මෙන්න මේ කෑල්ල තමයි අලුතින් එකතු කරේ
            if (user.isActive === false) {
                return res.status(403).json({
                    success: false,
                    error: 'Your account has been deactivated. Please contact your Shop Owner.'
                });
            }
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

            res.json({
                success: true,
                token: generateToken(user._id, user.role, user.shopId),
                user: { 
                    id: user._id, 
                    name: user.name, 
                    email: user.email, 
                    role: user.role, 
                    shopId: user.shopId 
                }
            });
        } else {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
    }
};

// @desc    Register a new staff member under the current shop
// @route   POST /api/auth/register-staff
// @access  Private (Owner/Admin only)
export const registerStaff = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            return res.status(400).json({ success: false, error: 'Name must be at least 2 characters' });
        }
        if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, error: 'Please provide a valid email' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
        }

        const allowedRoles = ['admin', 'manager', 'cashier'];
        const assignedRole = role || 'cashier';
        if (!allowedRoles.includes(assignedRole)) {
            return res.status(400).json({
                success: false,
                error: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Email already registered.' });
        }

        // 🔒 FORCE TENANT ISOLATION
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
            role: assignedRole,
            shopId: req.user.shopId,
            isEmailVerified: true // 💡 NEW: Staff emails are inherently verified by the Owner
        });

        res.status(201).json({
            success: true,
            message: 'Staff account created successfully',
            data: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Register Staff Error:", error);
        const message = error.code === 11000 ? 'Email already registered' : error.message;
        res.status(500).json({ success: false, error: message });
    }
};

// ─── NEW: OTP EMAIL VERIFICATION SYSTEM ───────────────────────────────────

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
export const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

        const normalizedEmail = email.toLowerCase().trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, error: 'Invalid email format' });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'This email is already registered. Please log in instead.' });
        }

        // Rate limit check
        const recentOtp = await EmailVerification.findOne({
            email: normalizedEmail,
            isUsed: false,
            expiresAt: { $gt: new Date() },
            createdAt: { $gt: new Date(Date.now() - 60000) } 
        });

        if (recentOtp) {
            return res.status(429).json({ success: false, error: 'Please wait 60 seconds before requesting a new OTP.' });
        }

        await EmailVerification.updateMany(
            { email: normalizedEmail, isUsed: false },
            { $set: { isUsed: true } }
        );

        const otp = crypto.randomInt(100000, 999999).toString();

        await EmailVerification.create({
            email: normalizedEmail,
            otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) 
        });

        const mailOptions = {
            from: `"Smart POS SaaS" <${process.env.EMAIL_USER}>`,
            to: normalizedEmail,
            subject: 'Your Smart POS Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #0f172a; text-align: center;">Welcome to Smart POS SaaS</h2>
                    <p style="color: #475569; text-align: center; font-size: 16px;">Use the verification code below to continue your registration.</p>
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="font-size: 36px; letter-spacing: 8px; color: #2563eb; margin: 0;">${otp}</h1>
                    </div>
                    <p style="color: #ef4444; text-align: center; font-size: 14px; font-weight: bold;">This code expires in 10 minutes.</p>
                    <p style="color: #94a3b8; text-align: center; font-size: 12px; margin-top: 30px;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        };

        // 💡 ෙමෙතන තමයි වෙනස! getTransporter() function එක call කරනවා.
        const mailer = getTransporter();
        await mailer.sendMail(mailOptions);
        
        res.status(200).json({ success: true, message: 'Verification code sent to your email.' });

    } catch (error) {
        // අනිවාර්යයෙන්ම Backend Terminal එකේ මේ Error එක මොකක්ද කියලා බලාගන්න (Console log එක)
        console.error('Send OTP Error:', error); 
        
        if (req.body.email) {
            await EmailVerification.deleteMany({ email: req.body.email.toLowerCase().trim() });
        }
        res.status(500).json({ success: false, error: 'Failed to send verification email. Please try again.' });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP are required' });

        const normalizedEmail = email.toLowerCase().trim();

        // Find the most recent active OTP
        const record = await EmailVerification.findOne({
            email: normalizedEmail,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        }).sort({ createdAt: -1 });

        if (!record) {
            return res.status(400).json({ success: false, error: 'OTP expired or not found. Please request a new code.' });
        }

        // Brute-force protection: Max 5 attempts
        if (record.attempts >= 5) {
            record.isUsed = true;
            await record.save();
            return res.status(400).json({ success: false, error: 'Too many incorrect attempts. Please request a new OTP.' });
        }

        // Check OTP match
        if (record.otp !== otp.trim()) {
            record.attempts += 1;
            await record.save();
            const remaining = 5 - record.attempts;
            return res.status(400).json({ success: false, error: `Incorrect code. ${remaining} attempt(s) remaining.` });
        }

        // Mark as successfully used
        record.isUsed = true;
        await record.save();

        // 🛡️ Generate short-lived Verification Token (30 mins) for the Registration Phase
        const verificationToken = jwt.sign(
            { email: normalizedEmail, verified: true },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.status(200).json({ 
            success: true, 
            verificationToken, 
            message: 'Email verified successfully.' 
        });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ success: false, error: 'Failed to verify OTP' });
    }
};