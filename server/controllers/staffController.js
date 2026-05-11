import User from '../models/User.js';
import mongoose from 'mongoose'; // FIX 1: needed for aggregate ObjectId cast

// @desc    Get all staff (excluding current owner)
// @route   GET /api/staff
// @access  Private (Owner/Admin)
export const getStaff = async (req, res) => {
    try {
        const staff = await User.find({
            shopId: req.user.shopId,
            _id: { $ne: req.user._id },
            role: { $ne: 'owner' }
        }).select('-password').lean();

        const roleOrder = { admin: 1, manager: 2, cashier: 3 };
        staff.sort((a, b) => {
            if (roleOrder[a.role] !== roleOrder[b.role]) {
                return roleOrder[a.role] - roleOrder[b.role];
            }
            return a.name.localeCompare(b.name);
        });

        res.status(200).json({ success: true, data: staff });
    } catch (error) {
        console.error("Get Staff Error:", error);
        res.status(500).json({ success: false, error: 'Server error while fetching staff.' });
    }
};

// @desc    Update staff details
// @route   PUT /api/staff/:id
// @access  Private (Owner/Admin)
export const updateStaff = async (req, res) => {
    try {
        const { name, role, isActive } = req.body;
        const staffId = req.params.id;

        const staff = await User.findOne({ _id: staffId, shopId: req.user.shopId });
        if (!staff) {
            return res.status(404).json({ success: false, error: 'Staff member not found.' });
        }

        if (staff.role === 'owner') {
            return res.status(403).json({ success: false, error: 'Action Blocked: Cannot modify owner account.' });
        }

        // FIX 2: Admin cannot assign 'admin' role to ANYONE — regardless of target's current role
        // Previous check only blocked promoting non-admins. An admin could still set existing admins.
        if (req.user.role === 'admin' && role === 'admin') {
            return res.status(403).json({ success: false, error: 'Admins cannot assign admin role. Only owners can.' });
        }

        if (staff._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'Use profile settings to update your own account.' });
        }

        const updateData = {};
        if (name && typeof name === 'string' && name.trim().length >= 2) {
            updateData.name = name.trim();
        }
        if (role && ['admin', 'manager', 'cashier'].includes(role)) {
            updateData.role = role;
        }
        if (typeof isActive === 'boolean') {
            updateData.isActive = isActive;
        }

        const updatedStaff = await User.findByIdAndUpdate(
            staffId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            success: true,
            message: 'Staff updated successfully',
            data: updatedStaff
        });
    } catch (error) {
        console.error("Update Staff Error:", error);
        res.status(500).json({ success: false, error: 'Server error while updating staff.' });
    }
};

// @desc    Toggle staff active status (Soft Deactivate/Reactivate)
// @route   PUT /api/staff/:id/toggle
// @access  Private (Owner/Admin)
export const deactivateStaff = async (req, res) => {
    try {
        const staffId = req.params.id;

        const staff = await User.findOne({ _id: staffId, shopId: req.user.shopId });
        if (!staff) {
            return res.status(404).json({ success: false, error: 'Staff member not found.' });
        }

        if (staff.role === 'owner') {
            return res.status(403).json({ success: false, error: 'Action Blocked: Cannot deactivate owner account.' });
        }

        if (staff._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, error: 'You cannot deactivate your own account.' });
        }

        // FIX 3: Use simple ! toggle
        // Previous: staff.isActive === false ? true : false
        // Problem: if isActive = undefined → undefined===false → false → WRONG (sets to false instead of true)
        // Fix: !undefined = true (correct — a user with no isActive gets activated properly)
        staff.isActive = !staff.isActive;
        await staff.save();

        res.status(200).json({
            success: true,
            message: staff.isActive ? 'Staff activated successfully' : 'Staff deactivated successfully',
            data: { id: staff._id, isActive: staff.isActive }
        });
    } catch (error) {
        console.error("Toggle Staff Status Error:", error);
        res.status(500).json({ success: false, error: 'Server error while changing status.' });
    }
};

// @desc    Reset staff password (owner only)
// @route   PUT /api/staff/:id/reset-password
// @access  Private (Owner only)
export const resetStaffPassword = async (req, res) => {
    try {
        const staffId = req.params.id;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
        }

        // Route already has authorize('owner') — this is a double-check
        if (req.user.role !== 'owner') {
            return res.status(403).json({ success: false, error: 'Action Blocked: Only owners can reset passwords.' });
        }

        const staff = await User.findOne({ _id: staffId, shopId: req.user.shopId });
        if (!staff) {
            return res.status(404).json({ success: false, error: 'Staff member not found.' });
        }

        if (staff.role === 'owner') {
            return res.status(403).json({ success: false, error: 'Action Blocked: Cannot reset owner password from here.' });
        }

        staff.password = newPassword; // User.js pre-save hook hashes this
        await staff.save();

        res.status(200).json({ success: true, message: 'Password reset successfully.' });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ success: false, error: 'Server error while resetting password.' });
    }
};

// @desc    Get staff dashboard statistics
// @route   GET /api/staff/stats
// @access  Private (Owner/Admin)
export const getStaffStats = async (req, res) => {
    try {
        const shopId = req.user.shopId;

        const total = await User.countDocuments({ shopId, role: { $ne: 'owner' } });

        const active = await User.countDocuments({
            shopId,
            role: { $ne: 'owner' },
            $or: [{ isActive: true }, { isActive: { $exists: false } }]
        });

        // FIX 1: Cast shopId to ObjectId for aggregate pipeline
        // Mongoose find() auto-converts string → ObjectId. Aggregate does NOT.
        // Without this cast, $match returns 0 results on all aggregations.
        const byRole = await User.aggregate([
            {
                $match: {
                    shopId: new mongoose.Types.ObjectId(shopId),
                    role: { $ne: 'owner' }
                }
            },
            {
                $group: { _id: '$role', count: { $sum: 1 } }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                total,
                active,
                inactive: total - active,
                byRole
            }
        });
    } catch (error) {
        console.error("Get Staff Stats Error:", error);
        res.status(500).json({ success: false, error: 'Server error while fetching stats.' });
    }
};