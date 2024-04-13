import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_SECRET,
  api_secret: process.env.API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload
    const response = await cloudinary.uploader.upload(
      localFilePath,
      {resource_type: auto}
    );
    //if success
    console.log("Successfully uploaded to cloudinary", response.url)
    return response

  } catch (error) {
    fs.unlinkSync(localFilePath)// remove from local 

  }
};


export {uploadOnCloudinary}


