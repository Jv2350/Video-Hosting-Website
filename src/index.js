//R FIRST APPROACH

// import mongoose from "mongoose";
// import { DB_NAME } from "./constant";
// import express from "express";

// const app = express();
// const PORT = process.env.PORT || 3000
// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("Error: ", error);
//       throw error;
//     });

//     app.listen(PORT,()=>{
// console.log(`Server is running at http://localhost:${PORT}`);

//     })
//   } catch (error) {
//     console.error("Error connect with the data base: ", error);
//     throw error;
//   }
// })();

// -------------------------------------------------------------------
// SECOND APPROACH

import dotenv from "dotenv";
import connectDB from "./db/index.js";
const PORT = process.env.PORT || 3000;
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(PORT || 8000, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  });
