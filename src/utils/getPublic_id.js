const getPublicId = (url) => {
  // 1. Remove query params if any
  const cleanUrl = url.split('?')[0];

  // 2. Extract everything after "/upload/"
  const parts = cleanUrl.split('/upload/')[1];

  // 3. Remove the version number (v12345) and rejoin the rest
  const publicIdWithExt = parts.split('/').slice(1).join('/');

  // 4. Remove file extension (.jpg, .mp4, etc.)
  const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");

  return publicId;
}
export {getPublicId}