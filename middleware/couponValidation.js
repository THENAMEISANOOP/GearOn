const { check, validationResult } = require("express-validator");
const Coupon = require("../models/couponModel");

const validateCoupon = [
    check("couponCode")
    .notEmpty()
    .withMessage("Coupon code is required.")
    .isLength({ max: 10 })
    .withMessage("Coupon code must not exceed 10 characters.")
    .custom(async (couponCode, { req }) => {
        const existingCoupon = await Coupon.findOne({ couponCode });

        // Allow updates if the couponCode belongs to the current coupon
        if (existingCoupon && existingCoupon._id.toString() !== req.body.couponId) {
            throw new Error("Coupon code must be unique.");
        }
    }),


    // Validate coupon type
    check("couponType")
        .isIn(["percentage", "flat"])
        .withMessage("Coupon type must be either 'percentage' or 'flat'."),

    // Validate coupon value (should be a positive number)
    check("couponValue")
        .isFloat({ min: 0 })
        .withMessage("Coupon value must be a positive number."),

    // Validate minimum purchase amount (should be greater than zero)
    check("minimumPurchaseAmount")
        .isFloat({ min: 0 })
        .withMessage("Minimum purchase amount must be greater than zero."),

    // Validate start date
    check("startDate")
        .isISO8601()
        .toDate()
        .withMessage("Start date must be a valid ISO8601 date."),

    // Validate end date
    check("endDate")
        .isISO8601()
        .toDate()
        .withMessage("End date must be a valid ISO8601 date."),

    // Handle validation errors
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // Map the error details to a more readable format
            const errorMessages = errors.array().map(err => {
                return {
                    field: err.param,
                    message: err.msg
                };
            });
            return res.status(400).json({ errors: errorMessages });
        }
        next();
    },
];

module.exports = validateCoupon;
