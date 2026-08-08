const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require("./review.js");
const DEFAULT_IMAGE_URL = "https://images.unsplash.com/photo-1501854140801-50d01698950b";

const listingSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    image: {
        url: String,
        filename: String
    },
    price: Number,
    category: {
        type: String,
        enum: [
            "Trending",
            "Rooms",
            "Iconic Cities",
            "Mountains",
            "Castles",
            "Amazing Pools",
            "Camping",
            "Farms",
            "Arctic",
            "Domes",
            "Boats"
        ],
        default: "Trending"
    },
    location: String,
    country: String,
    latitude: Number,
    longitude: Number,
    reviews: [ 
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
});

listingSchema.index({ category: 1 });
listingSchema.index({ title: "text", location: "text", country: "text" });

listingSchema.post('findOneAndDelete', async function(doc) {
    if (doc) {
        await Review.deleteMany({ _id: { $in: doc.reviews } });
    }
});


const Listing = mongoose.model("Listing", listingSchema);
module.exports = Listing;