const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

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

const initDB = async () => {
  await Listing.deleteMany({});
  initData.data = initData.data.map((obj, index) => ({
    ...obj,
    owner: "69b7f95cfc4622201a2d801d",
    category: categories[index % categories.length]
  }));
  await Listing.insertMany(initData.data);
  console.log("data was initialized");
  await mongoose.connection.close();
};

initDB();
