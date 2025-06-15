import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(400, "Unauthorized request");
  }

  // Aggregate pipeline to get total video views
  const totalVideoViews = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalViews: {
          $sum: "$views",
        },
      },
    },
  ]);

  // Get total subscribers
  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
  });

  // Get total videos
  const totalVideos = await Video.countDocuments({
    owner: userId,
  });

  // Get total likes on all videos
  const totalLikes = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $match: {
        "videoDetails.owner": new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $count: "totalLikes",
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalViews: totalVideoViews[0]?.totalViews || 0,
        totalSubscribers,
        totalVideos,
        totalLikes: totalLikes[0]?.totalLikes || 0,
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(400, "Unauthorized request");
  }

  const videos = await Video.find({
    owner: userId,
  })
    .select("-owner")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
