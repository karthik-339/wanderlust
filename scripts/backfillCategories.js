const mongoose = require("mongoose");
const Listing = require("../models/listing");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const categories = [
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
];

(async () => {
  try {
    await mongoose.connect(MONGO_URL);

    const listings = await Listing.find({}).sort({ _id: 1 }).select("_id");
    const ops = listings.map((doc, index) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { category: categories[index % categories.length] } }
      }
    }));

    if (ops.length) {
      await Listing.bulkWrite(ops);
    }

    const counts = await Listing.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    console.log("updated listings:", ops.length);
    console.log("category counts:", counts);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();
