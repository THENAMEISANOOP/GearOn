const Coupon = require("../../models/couponModel");

const validateCoupon = (couponType, couponValue, startDate, endDate) => {
    if (couponType === "percentage") {
        if (couponValue < 0 || couponValue > 100) {
            return { error: "Discount percentage must be between 0 and 100." };
        }
    } else if (couponType === "flat" && couponValue < 0) {
        return { error: "Flat discount amount cannot be negative." };
    }

    if (new Date(startDate) > new Date(endDate)) {
        return { error: "Start date cannot be after end date." };
    }

    if (new Date(endDate) < new Date()) {
        return { error: "End date cannot be in the past." };
    }

    return { error: null };
};

exports.getAdminCoupon = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const [coupons, totalCoupons] = await Promise.all([
            Coupon.find().skip(skip).limit(limit),
            Coupon.countDocuments(),
        ]);

        const totalPages = Math.ceil(totalCoupons / limit);

        res.render("admin/adminCoupon", {
            coupons,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).send("An error occurred while fetching coupons.");
    }
};

exports.addCoupon = async (req, res) => {
    try {
        const {
            couponCode,
            couponType,
            couponValue,
            minimumPurchaseAmount,
            startDate,
            endDate,
            perUserUsageLimit,
            isActive,
        } = req.body;

        // Validate coupon data
        const { error } = validateCoupon(couponType, couponValue, startDate, endDate);
        if (error) {
            return res.status(400).json({ message: error });
        }

        const newCoupon = new Coupon({
            couponCode,
            couponType,
            couponValue,
            minimumPurchaseAmount,
            startDate,
            endDate,
            perUserUsageLimit,
            isActive: isActive === "on",
        });

        await newCoupon.save();
        res.redirect("/admin/coupon");
    } catch (error) {
        console.error("Error adding coupon:", error);
        if (error.code === 11000) {
            return res.status(400).json({ message: "Coupon code must be unique." });
        }
        res.status(500).json({ message: "An error occurred while adding the coupon." });
    }
};

exports.updateCoupon = async (req, res) => {
    try {
        console.log(req.body); // Debug input data
        const { couponId, couponCode, couponType, couponValue, minimumPurchaseAmount, startDate, endDate, perUserUsageLimit, isActive } = req.body;

        // Validate the coupon data
        const { error } = validateCoupon(couponType, couponValue, startDate, endDate);
        if (error) {
            return res.status(400).json({ success: false, message: error });
        }

        // Update coupon in the database
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                couponCode,
                couponType,
                couponValue,
                minimumPurchaseAmount,
                startDate,
                endDate,
                perUserUsageLimit,
                isActive: isActive === "on", // Assuming checkbox-style input
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        // Successful update response
        res.json({
            success: true,
            message: "Coupon updated successfully!",
            coupon: updatedCoupon
        });
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ success: false, message: "An error occurred while updating the coupon." });
    }
};

exports.deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        console.log("Coupon ID to delete:", couponId);  // Check if couponId is received correctly

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        if (!deletedCoupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        console.log("Coupon deleted:", deletedCoupon);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({ message: "An error occurred while deleting the coupon." });
    }
};
