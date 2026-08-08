const mongoose = require("mongoose");
const Listing = require("../models/listing");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");

  const searchQuery = "Florence,Italy";
  const searchTerms = searchQuery
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const clauses = [];
  searchTerms.forEach((term) => {
    const regex = new RegExp(escapeRegex(term), "i");
    clauses.push({
      $or: [{ title: regex }, { location: regex }, { country: regex }]
    });
  });

  const filter = clauses.length ? { $and: clauses } : {};
  const docs = await Listing.find(filter, { title: 1, location: 1, country: 1 });

  console.log("terms:", searchTerms);
  console.log("matches:", docs.length);
  console.log(docs.map((d) => ({ title: d.title, location: d.location, country: d.country })));

  await mongoose.connection.close();
})();
