const { check, validationResult } = require("express-validator");
const Coupon = require("../models/couponModel"); // Assuming you have a Coupon model

const validateCoupon = [
    // Validate coupon code
    check("couponCode").notEmpty().withMessage("Coupon code is required."),

    // Validate coupon type
    check("couponType")
        .isIn(["percentage", "flat"])
        .withMessage("Invalid coupon type."),

    // Validate coupon value (should be a positive number)
    check("couponValue")
        .isFloat({ min: 0 })
        .withMessage("Coupon value must be a positive number."),

    // Validate start date
    check("startDate")
        .isISO8601()
        .toDate()
        .withMessage("Invalid start date."),

    // Validate end date
    check("endDate")
        .isISO8601()
        .toDate()
        .withMessage("Invalid end date."),

    // Check for duplicate coupon name (case-sensitive)
    async (req, res, next) => {
        const { name } = req.body;  // Assuming the coupon name is in the `name` field
        
        // Check if coupon name already exists (case-sensitive search)
        const existingCoupon = await Coupon.findOne({
            name: name  // Exact match (case-sensitive)
        });

        if (existingCoupon) {
            return res.status(400).json({ message: "Coupon name already exists!" });
        }

        next();
    },

    // Handle validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

module.exports = validateCoupon;
