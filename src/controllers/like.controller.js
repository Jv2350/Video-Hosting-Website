import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * toggle like/unlike for a video
 * works like youtube video like feature
 * if video is already liked, unlike it
 * if video is not liked, like it
 */
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // validate mongodb id format
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // verify video exists in database
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // check if user has already liked this video
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (existingLike) {
    // user has already liked, so remove the like
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Video unliked successfully")
      );
  }

  // create new like document
  await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Video liked successfully"));
});

/**
 * toggle like/unlike for a comment
 * similar to youtube comment like system
 * handles both like and unlike in single endpoint
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // ensure valid mongodb id
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // check if comment exists
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // look for existing like by this user
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (existingLike) {
    // remove existing like
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Comment unliked successfully")
      );
  }

  // add new like
  await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Comment liked successfully"));
});

/**
 * toggle like/unlike for a tweet
 * similar to twitter like functionality
 * maintains consistency with video and comment like patterns
 */
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  // validate tweet id format
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // ensure tweet exists
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // check for existing like
  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (existingLike) {
    // remove the like
    await Like.findByIdAndDelete(existingLike._id);

    return res
      .status(200)
      .json(
        new ApiResponse(200, { liked: false }, "Tweet unliked successfully")
      );
  }

  // create new like
  await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Tweet liked successfully"));
});

/**
 * get all videos liked by the current user
 * implements pagination for better performance
 * returns detailed video information including owner details
 * useful for "liked videos" playlist feature
 */
const getLikedVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const likedVideos = await Like.aggregate([
    {
      // find all video likes by current user
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        video: { $exists: true },
      },
    },
    {
      // get complete video information
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      // flatten video array for processing
      $unwind: "$video",
    },
    {
      // get video owner information
      $lookup: {
        from: "users",
        localField: "video.owner",
        foreignField: "_id",
        as: "video.owner",
      },
    },
    {
      // flatten owner array
      $unwind: "$video.owner",
    },
    {
      // select fields for response
      $project: {
        _id: 0,
        video: {
          _id: 1,
          title: 1,
          description: 1,
          duration: 1,
          views: 1,
          thumbnail: 1,
          owner: {
            _id: 1,
            username: 1,
            fullName: 1,
            avatar: 1,
          },
          createdAt: 1,
        },
      },
    },
    {
      // implement pagination - skip previous pages
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      // limit results per page
      $limit: parseInt(limit),
    },
  ]);

  if (!likedVideos?.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No liked videos found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
