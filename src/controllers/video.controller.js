import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = -1,
    userId,
  } = req.query;
  const filter = {};
  if (query) {
    filter.title = { $regex: query, $options: "i" };
  }
  if (userId && isValidObjectId(userId)) {
    filter.owner = userId;
  }
  const sort = {};
  sort[sortBy] = parseInt(sortType);
  const videos = await Video.find(filter)
    .populate("owner", "username fullName avatar")
    .sort(sort)
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));
  const total = await Video.countDocuments(filter);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos, total, page: parseInt(page), limit: parseInt(limit) },
        "Videos fetched successfully"
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title?.trim()) {
    throw new ApiError(400, "Video title is required");
  }
  if (!req.file) {
    throw new ApiError(400, "Video file is required");
  }
  // Upload video to cloudinary
  const uploadResult = await uploadOnCloudinary(req.file.path, "video");
  if (!uploadResult?.secure_url) {
    throw new ApiError(500, "Failed to upload video");
  }
  const video = await Video.create({
    title: title.trim(),
    description: description?.trim() || "",
    videoFile: uploadResult.secure_url,
    owner: req.user?._id,
    thumbnail: uploadResult.thumbnail_url || "",
    duration: uploadResult.duration || 0,
  });
  const createdVideo = await Video.findById(video._id).populate(
    "owner",
    "username fullName avatar"
  );
  return res
    .status(201)
    .json(new ApiResponse(201, createdVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const video = await Video.findById(videoId).populate(
    "owner",
    "username fullName avatar"
  );
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  // increment view count
  video.views += 1;
  await video.save();
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized to update this video");
  }
  if (title?.trim()) video.title = title.trim();
  if (description !== undefined) video.description = description.trim();
  // Optionally handle thumbnail update if file provided
  if (req.file) {
    const uploadResult = await uploadOnCloudinary(req.file.path, "image");
    if (uploadResult?.secure_url) {
      video.thumbnail = uploadResult.secure_url;
    }
  }
  await video.save();
  const updatedVideo = await Video.findById(videoId).populate(
    "owner",
    "username fullName avatar"
  );
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized to delete this video");
  }
  await Video.findByIdAndDelete(videoId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized to update this video");
  }
  video.isPublished = !video.isPublished;
  await video.save();
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: video.isPublished },
        `Video ${video.isPublished ? "published" : "unpublished"} successfully`
      )
    );
});
export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
