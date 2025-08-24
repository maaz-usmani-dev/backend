import { asyncHandler } from "../utils/AsyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateTokens = async (user) => {
    try {
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Failed to generate Tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    // get userdata

    const { username, email, fullname, password } = req.body

    // validation

    if ([username, email, fullname, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are required")
    }

    // check if already exists

    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    // check files and avatar

    if (existingUser) throw new ApiError(409, "User with email or username already exists")
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocal = req.files?.coverImage[0]?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar Local is required")
    }
    // upload on cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocal)

    // Check avatar

    if (!avatar) throw new ApiError(400, "Avatar Cloudinary is required")

    // create user object - create entry in db

    const user = await User.create({
        fullname,
        avatar,
        coverImage: coverImage || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // Check User and remove password and refresh token field from response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registration");
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Created Successfully")

    )


})
const loginUser = asyncHandler(async (req, res) => {
    // get data
    const {  username, password,email } = req.body

    // validate username or email
    if (!(username || email))
        throw new ApiError(500, "Username is required")

    // find user
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if (!user)
        throw new ApiError(404, "User Does not exist")
    // check password
    const passwordCorrect = await user.isPasswordCorrect(password)
    if (!passwordCorrect) {
        throw new ApiError(400, "Password is incorrect")
    }
    // generate access and refresh token
    const { accessToken, refreshToken } = await generateTokens(user)
    // either one more db query or update the user

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    // send cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User Logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "User Logged Out Successfully")
        )
})
export { registerUser, loginUser, logoutUser }