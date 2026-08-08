const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError.js");
const ITEMS_PER_PAGE = 9;

const DEFAULT_IMAGE_URL = "https://images.unsplash.com/photo-1501854140801-50d01698950b";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const geocodeLocation = async (location, country) => {
  const query = [location, country].filter(Boolean).join(", ").trim();
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
    throw new Error(`Geocoding failed with status ${response.status}`);
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

module.exports.index = async (req, res) => {
  const { category } = req.query;
  const searchQuery = (req.query.search || req.query.location || "").trim();
  const requestedPage = Number.parseInt(req.query.page, 10) || 1;
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
      clauses.push({ category });
    }
  }

  if (searchQuery) {
    const searchTerms = searchQuery
      .split(/[\s,]+/)
      .map((term) => term.trim())
      .filter(Boolean);

    searchTerms.forEach((term) => {
      const regex = new RegExp(escapeRegex(term), "i");
      clauses.push({
        $or: [
          { title: regex },
          { location: regex },
          { country: regex }
        ]
      });
    });
  }

  const filter = clauses.length ? { $and: clauses } : {};

  const totalListings = await Listing.countDocuments(filter);
  const totalPages = Math.max(Math.ceil(totalListings / ITEMS_PER_PAGE), 1);
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  const allListings = await Listing.find(filter)
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

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
    // throw new ExpressError(404, "Listing Not Found");
  }
  res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) => {
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;

  if (req.file) {
    let url = req.file.path;
    let filename = req.file.filename;
    newListing.image = { filename, url };
  } else {
    newListing.image = { filename: "default", url: DEFAULT_IMAGE_URL };
  }

  try {
    const geo = await geocodeLocation(newListing.location, newListing.country);
    if (geo) {
      newListing.latitude = geo.latitude;
      newListing.longitude = geo.longitude;
    }
  } catch (err) {
    console.warn("Geocoding failed on create:", err.message);
  }

  await newListing.save();
  req.flash("success", "New listing created successfully!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id).populate("owner");
  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
    // throw new ExpressError(404, "Listing Not Found");
  }
  let originalListingImageURL = listing.image.url
  originalListingImageURL = originalListingImageURL.replace("/upload", "/upload/w_250"); // Add transformation for smaller image in edit form
  res.render("listings/edit.ejs", { listing, originalListingImageURL });
};

module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
  }

  const { location, country } = req.body.listing;
  const locationChanged =
    (location !== undefined && location !== listing.location) ||
    (country !== undefined && country !== listing.country);

  const nextLocation = location ?? listing.location;
  const nextCountry = country ?? listing.country;

  if(typeof req.file !== "undefined") {
  let url = req.file.path;
  let filename = req.file.filename;
  listing.image = { filename, url };
  await listing.save();
  }

  const updates = { ...req.body.listing };
  if (locationChanged) {
    try {
      const geo = await geocodeLocation(nextLocation, nextCountry);
      updates.latitude = geo ? geo.latitude : null;
      updates.longitude = geo ? geo.longitude : null;
    } catch (err) {
      console.warn("Geocoding failed on update:", err.message);
    }
  }

  await Listing.findByIdAndUpdate(id, updates);
  req.flash("success", "Listing updated successfully!");
  res.redirect(`/listings/${id}`);
};

module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  const deletedListing = await Listing.findByIdAndDelete(id);
  if (!deletedListing) {
    throw new ExpressError(404, "Listing Not Found");
  }
  req.flash("success", "Listing deleted successfully!");
  res.redirect("/listings");
};