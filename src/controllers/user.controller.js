import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js ";

const registerUser = asyncHandler(async (req, res) => {
  // res.status(200).json({
  //   message: "User registered successfully",
  // });

  // get user details from frontend
  const { fullName, email, userName, password } = req.body;
  console.log("email", email);

  if (
    [fullName, email, userName, password].some((field) => filed?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = User.findOne({
    $or: [{ userName }, { email }],
  });
  console.log(existedUser);

  if (existedUser) {
    throw new ApiError(409, "User with email or username exists");
  }

  req.files?.avatar[0]?.path;

  // validation - not empty
  // check if user already exists: username, email
  // check for image, check for avatar
  // upload image to cloudinary
  // crate user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res
});

export { registerUser };
