const User = require("../../models/userModel");
const bcrypt = require("bcrypt");

// Render Change Password Page
exports.getChangePassword = async (req, res) => {
    try {
        const user = req.session.user; // Assume user is stored in session
        if (!user) {
            return res.redirect("/login"); // Redirect to login if user is not authenticated
        }
        res.render("user/changePassword", { user });
    } catch (err) {
        console.error("Error rendering change password page:", err);
        res.status(500).send("Server Error");
    }
};

exports.postChangePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const user = await User.findById(req.session.user._id);

        if (!user) {
            console.error("No user found.");
            return res.status(401).redirect("/login");
        }

        // Check if the current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        // Check if the new password matches the current password
        const isNewPasswordSame = await bcrypt.compare(newPassword, user.password);
        if (isNewPasswordSame) {
            return res.status(400).json({ message: "New password cannot be the same as the current password." });
        }

        // Check if new password and confirm password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New password and confirm password do not match." });
        }

        // Hash the new password and save it
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        // Send success response
        return res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("Error changing password:", error);

        // Send error response
        return res.status(500).json({ message: "An error occurred while changing the password." });
    }
};
