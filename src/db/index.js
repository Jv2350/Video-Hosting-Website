import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${MONGO_URI}/${DB_NAME}`
    );
    console.log(
      `\nMongo connected Successfully, DB host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("Mongo connection error: ", error);
    process.exit(1);
  }
};

export default connectDB;
