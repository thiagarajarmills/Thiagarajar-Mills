const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../db');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const { sendEmail } = require('../utils/email');
const fs = require('fs');
const path = require('path');
const errorLog = path.join(__dirname, '../server_error.log');

// Login Route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        // Case-insensitive lookup for PostgreSQL
        const user = await get("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", [username]);

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verify password
        // Note: In real app use compare. For this seed:
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, user: { user_id: user.user_id, username: user.username, role: user.role, full_name: user.full_name } });

    } catch (err) {
        console.error(err);
        try { fs.appendFileSync(errorLog, new Date().toISOString() + ': LOGIN ERROR: ' + err.message + '\n' + err.stack + '\n'); } catch (e) { }
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// Logout Route
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Get Current User (Me)
router.get('/me', require('../middleware/auth.middleware').authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Send Verification Code (Forgot Password) Route
router.post('/forgot-password', async (req, res) => {
    const { email, username } = req.body;

    if (!email || !username) {
        return res.status(400).json({ message: 'Username and email address are required' });
    }

    try {
        // Look up user by both username and email
        const user = await get(
            "SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND LOWER(email) = LOWER(?)",
            [username, email]
        );

        if (!user) {
            return res.status(404).json({ message: 'No account found matching this username and email address' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

        // Store in DB
        await run("UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE user_id = ?", [otp, expiry, user.user_id]);

        // Send Email
        const emailResult = await sendEmail({
            to: user.email,
            subject: 'Password Reset Verification Code - Thiagarajar Mills',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #4f46e5; text-align: center;">Thiagarajar Mills</h2>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
                    <p>Hello <strong>${user.full_name || user.username}</strong>,</p>
                    <p>We received a request to reset the password for your account. Please use the verification code below to proceed:</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 25px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5;">${otp}</span>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">This code is valid for 15 minutes. If you did not make this request, you can safely ignore this email.</p>
                </div>
            `
        });

        res.json({
            message: 'Verification code sent to email',
            isSimulated: !!emailResult.simulated,
            code: emailResult.simulated ? otp : undefined
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
    const { email, username, otp, newPassword } = req.body;

    if (!email || !username || !otp || !newPassword) {
        return res.status(400).json({ message: 'Username, email, verification code, and new password are required' });
    }

    try {
        const user = await get(
            "SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND LOWER(email) = LOWER(?)",
            [username, email]
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found with provided credentials' });
        }

        // Verify OTP code
        if (!user.reset_otp || user.reset_otp !== otp) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Verify Expiry
        if (new Date(user.reset_otp_expiry) < new Date()) {
            return res.status(400).json({ message: 'Verification code has expired' });
        }

        // Hash new password and update DB (clearing the OTP fields)
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await run(
            "UPDATE users SET password = ?, reset_otp = NULL, reset_otp_expiry = NULL WHERE user_id = ?",
            [passwordHash, user.user_id]
        );

        res.json({ message: 'Password updated successfully' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

module.exports = router;
