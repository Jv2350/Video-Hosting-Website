import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// registerUser controller to handle user registration
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend request body
  const { fullName, email, userName, password } = req.body;
  console.log("email", email);

  // check if any required field is empty
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exists by username or email
  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  console.log(existedUser);

  if (existedUser) {
    throw new ApiError(409, "User with email or username exists");
  }

  // get avatar and cover image file paths from request
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // check if avatar file is provided
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload avatar and cover image to cloudinary
  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverImageLocalPath);

  // check if avatar upload was successful
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // create new user in database
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: userName.toLowerCase(),
  });

  // fetch created user without password and refreshToken fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check if user creation was successful
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // send success response with created user data
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// export registerUser controller
export { registerUser };
