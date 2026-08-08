const Review = require("../models/review");
const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError.js");

module.exports.renderNewReviewForm = async (req, res) => {
	const listing = await Listing.findById(req.params.id);
	if (!listing) {
		throw new ExpressError(404, "Listing Not Found");
	}
	res.render("reviews/new.ejs", { listing });
};

module.exports.createReview = async (req, res) => {
	const listing = await Listing.findById(req.params.id);
	if (!listing) {
		throw new ExpressError(404, "Listing Not Found");
	}

	const review = new Review(req.body.review);
	review.author = req.user._id;
	listing.reviews.push(review);
	await review.save();
	await listing.save();
	req.flash("success", "New review created successfully!");

	res.redirect(`/listings/${req.params.id}`);
};

module.exports.deleteReview = async (req, res) => {
    const { id, reviewId } = req.params;

    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing Not Found");
    }

    const deletedReview = await Review.findByIdAndDelete(reviewId);
    if (!deletedReview) {
        throw new ExpressError(404, "Review Not Found");
    }

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    req.flash("success", "Review deleted successfully!");
    res.redirect(`/listings/${id}`);
};