import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { deleteVideo, getVideoDetails, uploadNewVideo } from "../controllers/video.controller.js";

const router = Router()

router.route("/upload").post(
    verifyJWT,
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    uploadNewVideo
)
router.route("/watch/:id").get(verifyJWT,getVideoDetails)
router.route("/remove/:id").delete(verifyJWT,deleteVideo)
export default router