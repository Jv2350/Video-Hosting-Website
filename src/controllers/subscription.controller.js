import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if channel exists
  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Prevent self-subscription
  if (channel._id.toString() === req.user?._id.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel");
  }

  // Find existing subscription
  const existingSubscription = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (existingSubscription) {
    // Unsubscribe
    await Subscription.findByIdAndDelete(existingSubscription._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully")
      );
  }

  // Create new subscription
  await Subscription.create({
    subscriber: req.user?._id,
    channel: channelId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { subscribed: true }, "Subscribed successfully")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscriber: { $first: "$subscriber" },
      },
    },
    {
      $project: {
        subscriber: 1,
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribers,
        total: totalSubscribers,
        page: parseInt(page),
        limit: parseInt(limit),
      },
      "Subscribers fetched successfully"
    )
  );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID");
  }

  const subscriber = await User.findById(subscriberId);
  if (!subscriber) {
    throw new ApiError(404, "Subscriber not found");
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "channel._id",
        foreignField: "owner",
        as: "channelVideos",
      },
    },
    {
      $addFields: {
        channel: { $first: "$channel" },
        totalVideos: { $size: "$channelVideos" },
        totalViews: {
          $reduce: {
            input: "$channelVideos",
            initialValue: 0,
            in: { $add: ["$$value", "$$this.views"] },
          },
        },
      },
    },
    {
      $project: {
        channel: 1,
        totalVideos: 1,
        totalViews: 1,
        createdAt: 1,
        channelVideos: 0,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  const totalSubscriptions = await Subscription.countDocuments({
    subscriber: subscriberId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribedChannels,
        total: totalSubscriptions,
        page: parseInt(page),
        limit: parseInt(limit),
      },
      "Subscribed channels fetched successfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
