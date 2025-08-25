import { Router } from "express";
import { changeAvatar, changeCoverImage, changePassword, editUserData, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)
// secured Routes
router.route("/logout").get(verifyJWT, logoutUser)
router.route("/refresh-token").get(refreshAccessToken)
router.route("/change-password").patch(verifyJWT,changePassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-info").patch(verifyJWT,editUserData)
router.route("/update-avatar").patch(
    verifyJWT,
    upload.single("avatar"),
    changeAvatar
)
router.route("/update-cover").patch(
    verifyJWT,
    upload.single("cover"),
    changeCoverImage
)

export default router