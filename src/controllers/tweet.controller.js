import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// create a new tweet in the database
const createTweet = asyncHandler(async (req, res) => {
  // extract content from request body
  const { content } = req.body;

  // validate tweet content
  if (!content || content?.trim() === "") {
    throw new ApiError(400, "Tweet content is required");
  }

  // create tweet in database
  const tweet = await Tweet.create({
    content: content.trim(),
    owner: req.user?._id,
  });

  // fetch tweet with owner details for response
  const createdTweet = await Tweet.findById(tweet._id).populate(
    "owner",
    "username fullName avatar"
  );

  if (!createdTweet) {
    throw new ApiError(500, "Something went wrong while creating tweet");
  }

  // send success response
  return res
    .status(201)
    .json(new ApiResponse(201, createdTweet, "Tweet created successfully"));
});

// get all tweets for a specific user with pagination
const getUserTweets = asyncHandler(async (req, res) => {
  // extract parameters from request
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // validate user id
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // check if user exists
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // use aggregation pipeline for complex tweet data
  const tweetsAggregate = await Tweet.aggregate([
    // match tweets by user id
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    // lookup user details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    // lookup likes information
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
      },
    },
    // add computed fields
    {
      $addFields: {
        owner: { $first: "$owner" },
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: {
              $in: [
                new mongoose.Types.ObjectId(req.user?._id),
                "$likes.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    // select fields for response
    {
      $project: {
        content: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        createdAt: 1,
      },
    },
    // sort by creation date, newest first
    {
      $sort: { createdAt: -1 },
    },
    // implement pagination
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  // handle case when no tweets found
  if (!tweetsAggregate?.length) {
    return res.status(200).json(new ApiResponse(200, [], "No tweets found"));
  }

  // send success response with tweets
  return res
    .status(200)
    .json(new ApiResponse(200, tweetsAggregate, "Tweets fetched successfully"));
});

// update an existing tweet's content
const updateTweet = asyncHandler(async (req, res) => {
  // extract parameters
  const { tweetId } = req.params;
  const { content } = req.body;

  // validate tweet id
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // validate content
  if (!content || content?.trim() === "") {
    throw new ApiError(400, "Tweet content is required");
  }

  // check if tweet exists
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // verify tweet ownership
  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized to update this tweet");
  }

  // update tweet and get updated document
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: content.trim(),
      },
    },
    { new: true }
  ).populate("owner", "username fullName avatar");

  if (!updatedTweet) {
    throw new ApiError(500, "Something went wrong while updating tweet");
  }

  // send success response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

// delete a tweet and its associated likes
const deleteTweet = asyncHandler(async (req, res) => {
  // get tweet id from params
  const { tweetId } = req.params;

  // validate tweet id
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // check if tweet exists
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // verify tweet ownership
  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized to delete this tweet");
  }

  // delete the tweet
  await Tweet.findByIdAndDelete(tweetId);

  // cleanup: remove all associated likes
  await mongoose.model("Like").deleteMany({ tweet: tweetId });

  // send success response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
