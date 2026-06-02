import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// @desc    Get current logged in user profile
// @route   GET /api/profile
// @access  Private (All Roles)
export const getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        res.status(500).json({ success: false, error: 'Server error while fetching profile' });
    }
};

// @desc    Update user profile details (Name only for now)
// @route   PUT /api/profile
// @access  Private
export const updateMyProfile = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim().length < 2 || name.trim().length > 60) {
            return res.status(400).json({ success: false, error: 'Name must be between 2 and 60 characters' });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { name: name.trim() },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: 'User no longer exists' });
        }

        res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};

// @desc    Change User Password
// @route   PUT /api/profile/change-password
// @access  Private
export const changeMyPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: 'Please provide both current and new passwords' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'New password must be at least 8 characters' });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ success: false, error: 'New password must be different from current password' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            await bcrypt.compare(currentPassword, '$2b$10$dummyhashfortimingonly00000000000000000000000000000000');
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify current password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'Current password is incorrect' });
        }

        // Set new password (pre-save hook will hash it)
        user.password = newPassword;
        await user.save();

        res.status(200).json({ 
            success: true, 
            message: 'Password changed successfully. Please log in again.' 
        });
    } catch (error) {
        console.error("Password Change Error:", error);
        res.status(500).json({ success: false, error: 'Failed to change password' });
    }
};