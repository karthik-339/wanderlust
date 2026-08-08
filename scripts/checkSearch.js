const mongoose = require("mongoose");
const Listing = require("../models/listing");

(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/wanderlust");

  const all = await Listing.countDocuments({});
  const regex = new RegExp("India", "i");
  const searchFilter = {
    $or: [{ title: regex }, { location: regex }, { country: regex }]
  };
  const searchCount = await Listing.countDocuments(searchFilter);
  const sample = await Listing.find(searchFilter, { title: 1, location: 1, country: 1 }).limit(10);

  console.log("all:", all);
  console.log("searchCount(India):", searchCount);
  console.log("sample:", sample.map((d) => ({ title: d.title, location: d.location, country: d.country })));

  await mongoose.connection.close();
})();
