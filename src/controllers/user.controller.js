import { asyncHandler } from "../utils/AsyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { cookieOptions } from "../constants.js"
import mongoose from "mongoose"
import { getPublicId } from "../utils/getPublic_id.js"

const registerUser = asyncHandler(async (req, res) => {

    // get userdata

    const { username, email, fullname, password } = req.body

    // validation

    if ([username, email, fullname, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are required")
    }
    // check if already exists

    const existingUser = await User.findOne({
        $or: [{ username: username.toLowerCase() }, { email }]
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
        avatar: avatar,
        coverImage: coverImage || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // Check User
    if (!user) {
        throw new ApiError(500, "Something went wrong while registration");
    }
    const safeUser = user.toObject()
    delete safeUser.password
    delete safeUser.refreshToken
    // return res
    return res.status(201).json(
        new ApiResponse(201, { user: safeUser }, "User Created Successfully")

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
        $or: [{ username: username?.toLowerCase() }, { email }]
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
    const safeUser = user.toObject()
    delete safeUser.password
    delete safeUser.refreshToken
    // send cookies

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: safeUser,
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
    if (newPassword === oldPassword) {
        throw new ApiError(400, "New password must not equal to old password")
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
    const publicId = getPublicId(req.user?.avatar)
    if (publicId) {
        await removeFromCloudinary(publicId)
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar,
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
    const publicId = getPublicId(req.user?.coverImage)
    if (publicId) {
        await removeFromCloudinary(publicId)
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage
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
const getUserProfileData = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, "Bad Request")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1
            }
        }
    ])
    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist")
    }
    console.log("Channel", channel);
    console.log("Channel data", channel[0]);
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "Channel Data Fetched Successfully"
            )
        )
})
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        },

                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    const history = user[0]?.watchHistory || [];
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                history,
                "Watch History fetched successfully"
            )
        )
})
const getChannelVideos = asyncHandler(async (req, res) => {
    const { username } = req.params
    if (!username) {
        throw new ApiError(400, "Bad Request")
    }
    const videos = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "videos",
                foreignField: "owner",
                localField: "_id",
                as: "channelVideos",
            },
        },
        {
            $project: {
                channelVideos: 1
            }
        }
    ])
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "Videos fetched successfully"
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
    changeCoverImage,
    getUserProfileData,
    getWatchHistory,
    getChannelVideos
}