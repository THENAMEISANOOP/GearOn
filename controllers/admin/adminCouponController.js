const Order = require("../../models/orderModel");
const Variant = require("../../models/variantSchema");
const Category = require("../../models/categoryModel");
const Product = require("../../models/productSchema");
const Offer = require("../../models/offerModel");
const Coupon = require("../../models/couponModel");

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

        if (couponType === "percentage" && (couponValue < 0 || couponValue > 100)) {
            return res.status(400).json({ message: "Discount percentage must be between 0 and 100." });
        } else if (couponType === "flat" && couponValue < 0) {
            return res.status(400).json({ message: "Flat discount amount cannot be negative." });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "Start date cannot be after end date." });
        }

        if (new Date(endDate) < new Date()) {
            return res.status(400).json({ message: "End date cannot be in the past." });
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
        const {
            couponId,
            couponCode,
            couponType,
            couponValue,
            minimumPurchaseAmount,
            startDate,
            endDate,
            perUserUsageLimit,
            isActive,
        } = req.body;

        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        if (couponType === "percentage" && (couponValue < 0 || couponValue > 100)) {
            return res.status(400).json({ message: "Discount percentage must be between 0 and 100." });
        } else if (couponType === "flat" && couponValue < 0) {
            return res.status(400).json({ message: "Flat discount amount cannot be negative." });
        }

        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "Start date cannot be after end date." });
        }

        if (new Date(endDate) < new Date()) {
            return res.status(400).json({ message: "End date cannot be in the past." });
        }

        coupon.couponCode = couponCode;
        coupon.couponType = couponType;
        coupon.couponValue = couponValue;
        coupon.minimumPurchaseAmount = minimumPurchaseAmount;
        coupon.startDate = startDate;
        coupon.endDate = endDate;
        coupon.perUserUsageLimit = perUserUsageLimit;
        coupon.isActive = isActive === "on";

        await coupon.save();

        res.redirect("/admin/coupon");
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ message: "An error occurred while updating the coupon." });
    }
};

exports.deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;

        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);

        if (!deletedCoupon) {
            return res.status(404).json({ message: "Coupon not found." });
        }

        res.redirect("/admin/coupon");
    } catch (error) {
        console.error("Error deleting coupon:", error);
        res.status(500).json({ message: "An error occurred while deleting the coupon." });
    }
};
