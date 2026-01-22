import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import { getPublicId } from "./getPublic_id";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfull
    //console.log("file is uploaded on cloudinary ", response.url);
    await fs.unlink(localFilePath).catch(() => {});
    return response.secure_url;
  } catch (error) {
    await fs.unlink(localFilePath).catch(() => {}); // remove the locally saved temporary file as the upload operation got failed
    return null;
  }
};

const removeFromCloudinary = async (url) => {
  try {
    const publicId = getPublicId(url);
    if (!publicId) {
      return null;
    }
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export { uploadOnCloudinary, removeFromCloudinary };
