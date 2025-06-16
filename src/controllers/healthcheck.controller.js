import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const healthcheck = asyncHandler(async (req, res) => {
  // check Database Connection
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  const healthStatus = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "Video Hosting API",
    status: "OK",
    database: {
      status: dbStatus,
      connection: mongoose.connection.host,
      name: mongoose.connection.name,
    },
    memory: {
      total:
        Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
          100 +
        " MB",
      used:
        Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100 +
        " MB",
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, healthStatus, "Health check passed successfully")
    );
});

export { healthcheck };
