import mongoose from 'mongoose';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; 
import EmailVerification from '../models/EmailVerification.js'; 
import { Resend } from 'resend'; 

// ━━━ 🛡️ NEW: Resend API Initialization ━━━
// const resend = new Resend(process.env.RESEND_API_KEY);

const generateToken = (id, role, shopId) => {
    return jwt.sign({ id, role, shopId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc   Register a new Shop and Owner
// @route  POST /api/auth/register
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

// @desc   Login User
// @route  POST /api/auth/login
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

// @desc   Register a new staff member under the current shop
// @route  POST /api/auth/register-staff
// @access Private (Owner/Admin only)
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

// @desc   Send OTP to email
// @route  POST /api/auth/send-otp
// @access Public
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

        const otp = crypto.randomInt(100000, 1000000).toString();

        await EmailVerification.create({
            email: normalizedEmail,
            otp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) 
        });

        // ━━━ 🛡️ RESEND EMAIL SENDING ━━━
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error: emailError } = await resend.emails.send({
            from: process.env.EMAIL_FROM,
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
        });

        if (emailError) {
            console.error('Resend API Error:', emailError);
            await EmailVerification.deleteMany({ email: normalizedEmail, isUsed: false });
            return res.status(500).json({ success: false, error: 'Failed to send verification email. Please try again.' });
        }
        
        res.status(200).json({ success: true, message: 'Verification code sent to your email.' });

    } catch (error) {
        console.error('Send OTP Error:', error); 
        
        if (req.body.email) {
            await EmailVerification.deleteMany({ email: req.body.email.toLowerCase().trim() });
        }
        res.status(500).json({ success: false, error: 'Failed to send verification email. Please try again.' });
    }
};

// @desc   Verify OTP
// @route  POST /api/auth/verify-otp
// @access Public
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

// @desc    Send password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
// ── FORGOT PASSWORD: Send OTP ─────────────────
export const sendPasswordResetOtp = async (req, res) => {
  try {
    const rawEmail = req.body.email;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = rawEmail.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    // Must belong to an existing account
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    // Rate-limit: 60-second cooldown (same as sendOtp)
    const recentOtp = await EmailVerification.findOne({
      email: normalizedEmail,
      createdAt: { $gt: new Date(Date.now() - 60_000) },
    }).sort({ createdAt: -1 });

    if (recentOtp) {
      const secondsLeft = Math.ceil(
        (recentOtp.createdAt.getTime() + 60_000 - Date.now()) / 1000
      );
      return res.status(429).json({
        success: false,
        message: `Please wait ${secondsLeft} second(s) before requesting another code.`,
      });
    }

    // Invalidate all previous unused OTPs for this email
    await EmailVerification.updateMany(
      { email: normalizedEmail, isUsed: false },
      { $set: { isUsed: true } }
    );

    // Generate fresh OTP
    const otp = crypto.randomInt(100_000, 999_999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 minutes

    const otpRecord = await EmailVerification.create({
      email: normalizedEmail,
      otp,
      expiresAt,
    });

    const htmlBody = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
          <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
              <tr>
                <td style="background:linear-gradient(135deg,#1d4ed8 0%,#1e40af 100%);padding:36px 40px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#93c5fd;">NexiaCore Smart POS</p>
                  <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;">Password Reset Request</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:40px 40px 32px;">
                  <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
                    Hi <strong style="color:#e2e8f0;">${user.name || 'there'}</strong>, we received a request to reset the password for your NexiaCore account.
                  </p>

                  <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Your Reset Code</p>
                    <p style="margin:0;font-size:48px;font-weight:800;letter-spacing:10px;color:#3b82f6;font-family:'Courier New',monospace;">${otp}</p>
                    <p style="margin:12px 0 0;font-size:13px;color:#64748b;">
                      ⏱ Expires in <strong style="color:#f59e0b;">10 minutes</strong>
                    </p>
                  </div>

                  <p style="margin:0 0 12px;font-size:14px;color:#64748b;line-height:1.6;">
                    Enter this code on the password reset page to set a new password.
                  </p>
                  <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;padding:16px;background:#0f172a;border-radius:8px;border-left:3px solid #1d4ed8;">
                    🔒 If you didn't request a password reset, your account is safe. You can safely ignore this email — no changes have been made.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 40px 32px;border-top:1px solid #1e293b;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#334155;">
                    © ${new Date().getFullYear()} NexiaCore Smart POS &bull; Secure Multi-tenant SaaS Platform
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `;

    // ━━━ 🛡️ RESEND EMAIL SENDING ━━━
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: 'NexiaCore — Password Reset Code',
      html: htmlBody,
    });

    if (emailError) {
      console.error('Password Reset Email Error:', emailError);
      await EmailVerification.findByIdAndDelete(otpRecord._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset code sent to your email.',
    });
  } catch (err) {
    console.error('[sendPasswordResetOtp]', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};


// @desc   Verify OTP and reset password
// @route  POST /api/auth/reset-password
// @access Public
// ── RESET PASSWORD: Verify OTP + Set New Password ──
export const resetPassword = async (req, res) => {
  try {
    const { email: rawEmail, otp, newPassword } = req.body;

    // ── Validate inputs ──────────────────────────
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = rawEmail.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    if (!otp || !/^\d{6}$/.test(otp.toString().trim())) {
      return res.status(400).json({ success: false, message: 'A valid 6-digit code is required.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    // ── Find latest valid OTP record ─────────────
    const record = await EmailVerification.findOne({
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please request a new code.',
      });
    }

    // ── Brute-force protection ────────────────────
    if (record.attempts >= 5) {
      record.isUsed = true;
      await record.save();
      return res.status(400).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.',
      });
    }

    // ── Verify OTP ────────────────────────────────
    if (record.otp !== otp.toString().trim()) {
      record.attempts += 1;
      await record.save();
      const remaining = 5 - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remaining} attempt(s) remaining.`,
      });
    }

    // ── Mark OTP used ─────────────────────────────
    record.isUsed = true;
    await record.save();

    // ── Update user password (pre-save hook hashes it) ──
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};