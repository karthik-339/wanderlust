const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError.js");

const ITEMS_PER_PAGE = 9;

const DEFAULT_IMAGE_URL =
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80";

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const geocodeLocation = async (location, country) => {
    const query = [location, country]
        .filter(Boolean)
        .join(", ")
        .trim();

    if (!query) {
        return null;
    }

    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: query,
        format: "jsonv2",
        limit: "1"
    }).toString()}`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": "wanderlust-app/1.0"
        }
    });

    if (!response.ok) {
        throw new Error(
            `Geocoding failed with status ${response.status}`
        );
    }

    const results = await response.json();

    if (!Array.isArray(results) || results.length === 0) {
        return null;
    }

    return {
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon)
    };
};


// ========================================
// INDEX
// ========================================

module.exports.index = async (req, res) => {
    const { category } = req.query;

    const searchQuery = (
        req.query.search ||
        req.query.location ||
        ""
    ).trim();

    const requestedPage =
        Number.parseInt(req.query.page, 10) || 1;

    const page = Math.max(requestedPage, 1);

    const clauses = [];

    if (category && category !== "All") {

        if (category === "Trending") {

            clauses.push({
                $or: [
                    { category: "Trending" },
                    { category: { $exists: false } },
                    { category: null }
                ]
            });

        } else {

            clauses.push({
                category
            });

        }
    }

    if (searchQuery) {

        const searchTerms = searchQuery
            .split(/[\s,]+/)
            .map((term) => term.trim())
            .filter(Boolean);

        searchTerms.forEach((term) => {

            const regex = new RegExp(
                escapeRegex(term),
                "i"
            );

            clauses.push({
                $or: [
                    { title: regex },
                    { location: regex },
                    { country: regex }
                ]
            });

        });
    }

    const filter = clauses.length
        ? { $and: clauses }
        : {};

    const totalListings =
        await Listing.countDocuments(filter);

    const totalPages = Math.max(
        Math.ceil(
            totalListings / ITEMS_PER_PAGE
        ),
        1
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const skip =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

    const allListings =
        await Listing.find(filter)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(ITEMS_PER_PAGE);

    const queryParams = {
        ...req.query,
        page: undefined
    };

    res.render("listings/index.ejs", {
        allListings,
        selectedCategory: category || "All",
        searchQuery,

        pagination: {
            currentPage,
            totalPages,
            totalListings,
            hasPrevPage: currentPage > 1,
            hasNextPage: currentPage < totalPages
        },

        queryParams
    });
};


// ========================================
// NEW LISTING FORM
// ========================================

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};


// ========================================
// SHOW LISTING
// ========================================

module.exports.showListing = async (req, res) => {

    const { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        })
        .populate("owner");

    if (!listing) {

        req.flash(
            "error",
            "Listing not found."
        );

        return res.redirect("/listings");
    }

    res.render(
        "listings/show.ejs",
        {
            listing
        }
    );
};


// ========================================
// CREATE LISTING
// ========================================

module.exports.createListing = async (req, res) => {

    console.log("\n=================================");
    console.log("       CREATE LISTING DEBUG");
    console.log("=================================");

    console.log("REQ.FILE:");
    console.log(req.file);

    console.log("REQ.BODY:");
    console.log(req.body);

    console.log("=================================");


    const newListing =
        new Listing(req.body.listing);

    newListing.owner =
        req.user._id;


    // ========================================
    // IMAGE
    // ========================================

    if (req.file) {

        console.log("IMAGE FOUND!");

        const url =
            req.file.secure_url;

        const filename =
            req.file.public_id;

        console.log("Cloudinary URL:");
        console.log(url);

        console.log("Cloudinary Filename:");
        console.log(filename);


        newListing.image = {
            url: url,
            filename: filename
        };

    } else {

        console.log(
            "NO IMAGE FOUND - USING DEFAULT IMAGE"
        );

        newListing.image = {
            filename: "default",
            url: DEFAULT_IMAGE_URL
        };
    }


    console.log(
        "IMAGE BEFORE SAVE:"
    );

    console.log(
        newListing.image
    );


    // ========================================
    // GEOCODING
    // ========================================

    try {

        const geo =
            await geocodeLocation(
                newListing.location,
                newListing.country
            );

        if (geo) {

            newListing.latitude =
                geo.latitude;

            newListing.longitude =
                geo.longitude;
        }

    } catch (err) {

        console.warn(
            "Geocoding failed on create:",
            err.message
        );
    }


    // ========================================
    // SAVE TO MONGODB
    // ========================================

    await newListing.save();


    console.log(
        "IMAGE AFTER SAVE:"
    );

    console.log(
        newListing.image
    );

    console.log(
        "MONGO DOCUMENT ID:"
    );

    console.log(
        newListing._id
    );

    console.log(
        "=================================\n"
    );


    req.flash(
        "success",
        "New listing created successfully!"
    );

    res.redirect("/listings");
};


// ========================================
// EDIT FORM
// ========================================

module.exports.renderEditForm = async (
    req,
    res
) => {

    const { id } = req.params;

    const listing =
        await Listing.findById(id)
            .populate("owner");

    if (!listing) {

        req.flash(
            "error",
            "Listing not found."
        );

        return res.redirect("/listings");
    }


    let originalListingImageURL =
        listing.image.url;

    originalListingImageURL =
        originalListingImageURL.replace(
            "/upload",
            "/upload/w_250"
        );


    res.render(
        "listings/edit.ejs",
        {
            listing,
            originalListingImageURL
        }
    );
};


// ========================================
// UPDATE LISTING
// ========================================

module.exports.updateListing = async (
    req,
    res
) => {

    const { id } = req.params;

    const listing =
        await Listing.findById(id);

    if (!listing) {

        req.flash(
            "error",
            "Listing not found."
        );

        return res.redirect("/listings");
    }


    const {
        location,
        country
    } = req.body.listing;


    const locationChanged =
        (
            location !== undefined &&
            location !== listing.location
        ) ||
        (
            country !== undefined &&
            country !== listing.country
        );


    const nextLocation =
        location ?? listing.location;

    const nextCountry =
        country ?? listing.country;


    // ========================================
    // UPDATE NORMAL FIELDS
    // ========================================

    Object.assign(
        listing,
        req.body.listing
    );


    // ========================================
    // UPDATE IMAGE
    // ========================================

    if (req.file) {

        console.log(
            "NEW IMAGE UPLOADED DURING UPDATE"
        );

        console.log(
            "REQ.FILE:",
            req.file
        );


        listing.image = {
            url: req.file.secure_url,
            filename: req.file.public_id
        };


        console.log(
            "UPDATED IMAGE:",
            listing.image
        );
    }


    // ========================================
    // UPDATE LOCATION
    // ========================================

    if (locationChanged) {

        try {

            const geo =
                await geocodeLocation(
                    nextLocation,
                    nextCountry
                );

            if (geo) {

                listing.latitude =
                    geo.latitude;

                listing.longitude =
                    geo.longitude;

            } else {

                listing.latitude = null;
                listing.longitude = null;
            }

        } catch (err) {

            console.warn(
                "Geocoding failed on update:",
                err.message
            );
        }
    }


    // ========================================
    // SAVE ONCE
    // ========================================

    await listing.save();


    req.flash(
        "success",
        "Listing updated successfully!"
    );

    res.redirect(
        `/listings/${id}`
    );
};


// ========================================
// DELETE LISTING
// ========================================

module.exports.deleteListing = async (
    req,
    res
) => {

    const { id } = req.params;

    const deletedListing =
        await Listing.findByIdAndDelete(id);

    if (!deletedListing) {

        throw new ExpressError(
            404,
            "Listing Not Found"
        );
    }


    req.flash(
        "success",
        "Listing deleted successfully!"
    );

    res.redirect("/listings");
};