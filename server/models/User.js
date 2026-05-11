import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
name: { type: String, required: true },
email: { type: String, required: true, unique: true },
password: { type: String, required: true },
role: { type: String, enum: ['owner', 'admin', 'manager', 'cashier'], default: 'cashier' },
shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
isEmailVerified: { type: Boolean, default: false },
// ━━━ 🛡️ BUG FIX: Add isActive to Schema ━━━
isActive: { type: Boolean, default: true },
}, { timestamps: true });

// ━━━ 🛡️ Mongoose 9.x Fix: NO next() parameter ━━━
UserSchema.pre('save', async function() {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return; // Mongoose 9.x: Just return, don't call next()
    }
    
    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Login වෙද්දී password එක check කරන function එක
UserSchema.methods.matchPassword = async function(enteredPassword) {
return await bcrypt.compare(enteredPassword, this.password);
};

// Model එක හදලා ඒක default export එක විදිහට එළියට දෙනවා
const User = mongoose.model('User', UserSchema);
export default User;