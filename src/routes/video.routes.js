import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import {
  deleteVideo,
  editVideoInfo,
  getVideoDetails,
  uploadNewVideo,
} from "../controllers/video.controller.js";

const router = Router();

router.route("/upload").post(
  verifyJWT,
  upload.fields([
    {
      name: "videoFile",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  uploadNewVideo
);
router.route("/watch/:id").get(verifyJWT, getVideoDetails);
router.route("/remove/:id").delete(verifyJWT, deleteVideo);
router.route("/video/:id").patch(verifyJWT, editVideoInfo);
export default router;
