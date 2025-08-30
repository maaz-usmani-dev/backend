import { asyncHandler } from "../utils/AsyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.model.js"
import { removeFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { getPublicId } from "../utils/getPublic_id.js"
import { User } from "../models/user.model.js"


const uploadNewVideo = asyncHandler(async (req, res) => {
    const { title, description, duration, isPublished } = req.body

    if ([title, description].some((field) => field?.trim() === "") || !duration || isPublished === undefined) {
        throw new ApiError(400, "All fields are required")
    }
    const existingVideo = await Video.findOne(
        { title }
    )
    if (existingVideo) {
        throw new ApiError(400, "A Video with this title already exists")
    }
    const videoFileLocal = req.files?.videoFile[0]?.path
    const thumbnailLocal = req.files?.thumbnail[0]?.path

    if (!(videoFileLocal && thumbnailLocal)) {
        throw new ApiError(400, "Video and Thumbnail are required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocal)
    const thumbnail = await uploadOnCloudinary(thumbnailLocal)

    if (!(videoFile && thumbnail)) {
        throw new ApiError(400, "Failed to upload files")
    }

    const video = await Video.create({
        owner: req.user?._id,
        title,
        description,
        duration,
        isPublished,
        videoFile,
        thumbnail,
    })

    if (!video) {
        throw new ApiError(500, "Failed to upload the video please try again")
    }
    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                video,
                "Video Uploaded Successfully"
            )
        )
})
const getVideoDetails = asyncHandler(async (req, res) => {
    const { id } = req.params
    if (!id) {
        throw new ApiError(400, "Bad Request")
    }
    const video = await Video.findById(id)
    if (!video) {
        throw new ApiError(404, "Video Not Found")
    }
    video.views++;
    await video.save({ validateBeforeSave: true })
    await addToWatchHistory(req.user?._id, video._id)
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video Found Successfully"
            )
        )
})
const deleteVideo = asyncHandler(async (req, res) => {

    const { id } = req.params
    const video = await Video.findById(id)
    if (!video) {
        throw new ApiError(404, "Video Not Found")
    }
    if (req.user?._id.toString() !== video.owner.toString()) {
        throw new ApiError(403, "Unauthorized Access")
    }
    const videoPublicId = getPublicId(video.videoFile)
    if (videoPublicId) {
        await removeFromCloudinary(videoPublicId)
    }
    const thumbnailPublicId = getPublicId(video.thumbnail)
    if (thumbnailPublicId) {
        await removeFromCloudinary(thumbnailPublicId)
    }
    await video.deleteOne()
    return res
        .status(200)
        .json(
            new ApiResponse(
                200, {}, "Video Deleted Successfully"
            )
        )
})
const addToWatchHistory = asyncHandler(async (userId, videoId) => {
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(404, "User does not exist")
    }
    user.watchHistory.push(videoId)
    await user.save({ validateBeforeSave: false })
})
export {
    uploadNewVideo,
    getVideoDetails,
    deleteVideo
}