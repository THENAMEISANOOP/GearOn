const { check, validationResult } = require("express-validator");

const validateCoupon = [
    check("couponCode").notEmpty().withMessage("Coupon code is required."),
    check("couponType")
        .isIn(["percentage", "flat"])
        .withMessage("Invalid coupon type."),
    check("couponValue")
        .isFloat({ min: 0 })
        .withMessage("Coupon value must be a positive number."),
    check("startDate")
        .isISO8601()
        .toDate()
        .withMessage("Invalid start date."),
    check("endDate")
        .isISO8601()
        .toDate()
        .withMessage("Invalid end date."),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

module.exports = validateCoupon;
