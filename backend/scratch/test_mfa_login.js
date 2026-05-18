const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('../src/models/Lab');
require('../src/models/User');
require('dotenv').config();

const User = mongoose.model('User');
const Lab = mongoose.model('Lab');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB.");

        // Create temporary lab and user
        const lab = new Lab({ name: "MFA Test Lab " + Date.now() });
        await lab.save();

        const email = `test_mfa_${Date.now()}@example.com`;
        const plainPassword = "Password123!";
        const hash = await bcrypt.hash(plainPassword, 10);

        const user = new User({
            name: "MFA Test User",
            email,
            password: hash,
            labs: [lab._id],
            active_lab: lab._id,
            mfa_enabled: true
        });
        await user.save();
        console.log(`Created test user: ${email}. last_mfa_verified_at is currently null.`);

        // Setup mock express req, res
        const req = {
            body: { email, password: plainPassword },
            ip: "127.0.0.1",
            headers: { "user-agent": "test" }
        };

        const controller = require('../src/controllers/auth/authController');

        // Test Case 1: First login (expect MFA verification)
        console.log("\n--- TEST CASE 1: First Login after Registration ---");
        let mfaTriggered = false;
        let resJson = null;
        const res1 = {
            status: (code) => ({ json: (data) => { resJson = data; } }),
            json: (data) => { resJson = data; }
        };
        await controller.login(req, res1);
        console.log("Response:", resJson);
        if (resJson && resJson.requireMfa) {
            console.log("SUCCESS: Prompted for MFA on first registration login.");
            mfaTriggered = true;
        } else {
            console.log("FAILURE: Expected MFA prompt.");
        }

        // Test Case 2: MFA recently verified (expect bypass MFA)
        console.log("\n--- TEST CASE 2: MFA recently verified (within 30 days) ---");
        user.last_mfa_verified_at = new Date();
        await user.save();
        
        let resJson2 = null;
        const res2 = {
            status: (code) => ({ json: (data) => { resJson2 = data; } }),
            json: (data) => { resJson2 = data; }
        };
        await controller.login(req, res2);
        console.log("Response (should contain token):", resJson2 ? (resJson2.token ? "Token returned!" : resJson2) : "No response");
        if (resJson2 && resJson2.token) {
            console.log("SUCCESS: Bypassed MFA since verified within 30 days.");
        } else {
            console.log("FAILURE: Expected MFA bypass.");
        }

        // Test Case 3: MFA verified > 30 days ago (expect MFA verification)
        console.log("\n--- TEST CASE 3: MFA verified > 30 days ago (35 days) ---");
        const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
        user.last_mfa_verified_at = thirtyFiveDaysAgo;
        await user.save();

        let resJson3 = null;
        const res3 = {
            status: (code) => ({ json: (data) => { resJson3 = data; } }),
            json: (data) => { resJson3 = data; }
        };
        await controller.login(req, res3);
        console.log("Response:", resJson3);
        if (resJson3 && resJson3.requireMfa) {
            console.log("SUCCESS: Prompted for MFA because verification has expired (>30 days).");
        } else {
            console.log("FAILURE: Expected MFA prompt.");
        }

        // Clean up
        await Lab.findByIdAndDelete(lab._id);
        await User.findByIdAndDelete(user._id);
        console.log("\nCleanup complete.");

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
