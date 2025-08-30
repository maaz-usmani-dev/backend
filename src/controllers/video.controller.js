import { asyncHandler } from "../utils/AsyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


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
        videoFile: videoFile.secure_url,
        thumbnail: thumbnail.secure_url
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

export {
    uploadNewVideo
}