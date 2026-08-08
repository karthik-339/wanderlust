const express = require("express");
const router = express.Router({ mergeParams: true });
const { Types } = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { isLoggedIn, isReviewAuthor, validateReview } = require("../middleware.js");
const reviewController = require("../controllers/reviews.js"); 

const validateObjectIdParam = (paramName) => (req, res, next, value) => {
	if (!Types.ObjectId.isValid(value)) {
		return next(new ExpressError(400, `Invalid ${paramName}`));
	}
	next();
};

// router.param("id") intentionally omitted — :id is a parent param;
// mergeParams:true copies it into req.params but router.param() won't fire for parent params.
// Validation is handled by the router.use() check below.
router.param("reviewId", validateObjectIdParam("review id"));

router.use((req, res, next) => {
	if (!Types.ObjectId.isValid(req.params.id)) {
		return next(new ExpressError(400, "Invalid listing id"));
	}
	next();
});

// Render new review form
router.get("/new", isLoggedIn, wrapAsync(reviewController.renderNewReviewForm));

// Create review
router.post("/", isLoggedIn, validateReview, wrapAsync(reviewController.createReview));

// Delete review
router.delete("/:reviewId", isLoggedIn, isReviewAuthor, wrapAsync(reviewController.deleteReview));

module.exports = router;
