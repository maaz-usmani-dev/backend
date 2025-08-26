import { asyncHandler } from "../utils/AsyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { cookieOptions } from "../constants.js"

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
    if (existingUser) throw new ApiError(409, "User with email or username already exists")

    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocal;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocal = req.files.coverImage[0].path
    }
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
        avatar: avatar.secure_url,
        avatarPublicId: avatar.public_id,
        coverImage: coverImage.secure_url || "",
        coverPublicId: coverImage.public_id,
        email,
        password,
        username: username.toLowerCase()
    })

    // Check User

    if (!user) {
        throw new ApiError(500, "Something went wrong while registration");
    }

    // return res
    return res.status(201).json(
        new ApiResponse(201, user, "User Created Successfully")

    )



})
const loginUser = asyncHandler(async (req, res) => {
    // get data
    const { username, password, email } = req.body

    // validate username or email
    if (!(username || email))
        throw new ApiError(400, "Username or Email is required")

    // find user
    const user = await User.findOne({
        $or: [{ username }, { email }]
    }).select("+password +refreshToken")
    if (!user)
        throw new ApiError(404, "User Does not exist")
    // check password
    const passwordCorrect = await user.isPasswordCorrect(password)
    if (!passwordCorrect) {
        throw new ApiError(400, "Invalid credentials")
    }
    // generate access and refresh token
    const { accessToken, refreshToken } = await user.generateTokens()
    // either one more db query or update the user
    user.password = undefined
    user.refreshToken = undefined
    // send cookies

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user,
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
                refreshToken: ""
            }
        },
        {
            new: true
        }
    )
    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(
            new ApiResponse(200, {}, "User Logged Out Successfully")
        )
})
const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingToken = req.cookies.refreshToken || req.body.refreshToken
        if (!incomingToken) {
            throw new ApiError(401, "Unauthorized Access")
        }
        const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id).select("+refreshToken")
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
        const tokenCorrect = await user.isTokenCorrect(incomingToken)
        if (!tokenCorrect) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        const { accessToken, refreshToken } = await user.generateTokens()

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken
                    },
                    "Access Token Refreshed"
                )
            )
    } catch (error) {
        console.error(error);
        throw new ApiError(401, error?.message || "Could not refresh tokens")
    }

})
const changePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Fields are required")
    }
    const user = await User.findById(req.user?._id).select("+password")
    const passwordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!passwordCorrect) {
        throw new ApiError(400, "Old Password is invalid")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed Successfully")
        )
})
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "user fetched successfully"
            )
        )
})
const editUserData = asyncHandler(async (req, res) => {
    const { email, fullname } = req.body
    if (!(email || fullname)) {
        throw new ApiError(400, "All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                email,
                fullname
            }
        },
        {
            new: true
        }
    )
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "User Updated Successfully")
        )
})
const changeAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "File is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar")
    }
    if (req.user?.avatarPublicId) {
        await removeFromCloudinary(req.user.avatarPublicId)
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.secure_url,
                avatarPublicId: avatar.public_id
            }
        },
        {
            new: true
        }
    )
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Avatar updated successfully"
            )
        )

})
const changeCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocal = req.file?.path
    if (!coverImageLocal) {
        throw new ApiError(400, "File is required")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocal)
    if (!coverImage) {
        throw new ApiError(500, "Failed to upload avatar")
    }
    if (req.user?.coverPublicId) {
        await removeFromCloudinary(req.user.coverPublicId)
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.secure_url,
                coverPublicId: coverImage.public_id
            }
        },
        {
            new: true
        }
    )
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Cover Image updated successfully"
            )
        )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    editUserData,
    getCurrentUser,
    changeAvatar,
    changeCoverImage
}