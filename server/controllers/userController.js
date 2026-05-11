import User from '../models/User.js';

// @desc    Get all staff for the current shop
// @route   GET /api/users
// @access  Private (Owner/Admin)
export const getStaff = async (req, res) => {
    try {
        // 🔒 Tenant Isolation: Fetch only users from the same shop.
        // Also exclude the current logged-in user from the list.
        const staff = await User.find({ 
            shopId: req.user.shopId,
            _id: { $ne: req.user._id }
        }).select('-password').sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: staff });
    } catch (error) {
        console.error("Get Staff Error:", error);
        res.status(500).json({ success: false, error: 'Server error while fetching staff.' });
    }
};

// @desc    Update staff role or status
// @route   PUT /api/users/:id
// @access  Private (Owner/Admin)
export const updateStaff = async (req, res) => {
    try {
        const { role, status } = req.body;
        const staffId = req.params.id;

        // 🔒 Tenant Isolation: Ensure target user belongs to the same shop
        const targetUser = await User.findOne({ _id: staffId, shopId: req.user.shopId });

        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'Staff member not found.' });
        }

        // 🛡️ Security: Hierarchy Protection
        if (targetUser.role === 'owner') {
            return res.status(403).json({ success: false, error: 'Action Blocked: Cannot modify the Owner account.' });
        }
        if (req.user.role === 'admin' && targetUser.role === 'admin') {
             return res.status(403).json({ success: false, error: 'Action Blocked: Admins cannot modify other Admins. Contact the Owner.' });
        }

        if (role) targetUser.role = role;
        if (status) targetUser.status = status;

        await targetUser.save();

        res.status(200).json({ 
            success: true, 
            message: 'Staff updated successfully',
            data: { id: targetUser._id, name: targetUser.name, role: targetUser.role, status: targetUser.status } 
        });
    } catch (error) {
        console.error("Update Staff Error:", error);
        res.status(500).json({ success: false, error: 'Server error while updating staff.' });
    }
};

// @desc    Delete staff member
// @route   DELETE /api/users/:id
// @access  Private (Owner/Admin)
export const deleteStaff = async (req, res) => {
    try {
        const staffId = req.params.id;

        // 🔒 Tenant Isolation Check
        const targetUser = await User.findOne({ _id: staffId, shopId: req.user.shopId });

        if (!targetUser) {
            return res.status(404).json({ success: false, error: 'Staff member not found.' });
        }

        // 🛡️ Security: Hierarchy Protection
        if (targetUser.role === 'owner') {
            return res.status(403).json({ success: false, error: 'Action Blocked: Cannot delete the Owner account.' });
        }
        if (req.user.role === 'admin' && targetUser.role === 'admin') {
             return res.status(403).json({ success: false, error: 'Action Blocked: Admins cannot delete other Admins.' });
        }

        await User.findByIdAndDelete(staffId);

        res.status(200).json({ success: true, message: 'Staff member permanently deleted.' });
    } catch (error) {
        console.error("Delete Staff Error:", error);
        res.status(500).json({ success: false, error: 'Server error while deleting staff.' });
    }
};