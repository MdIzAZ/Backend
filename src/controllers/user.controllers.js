import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"

const registerUser = asyncHandler(async(req, res)=>{
    // res.status(200).json({
    //     message: "ok izaz"
    // })
    

    //user data from frontend
    //validation
    //if already exists: username
    //check for image
    //upload to cloudinary
    //create user obj- create entry on db
    //remove password and refresh token field from response
    //chech creation
    //return response


    const {fullName, email, username, password} = req.body
    console.log(email)

    //validation 1
    if ([fullName, email, username, password].some((f)=>
        f?.trim() === ""
    )) {
        throw new ApiError(400, "All fields are required")
    }

    //validation 2
    const isUserAlreadyExists = User.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserAlreadyExists) {
        throw new ApiError(409, "username or email already take. Try another one")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    console.log(avatarLocalPath)

    const coverImageLocalPath = req.files?.coverImage[0]?.path
    console.log(coverImageLocalPath)

    if (! avatarLocalPath) {
        throw new ApiError(400, "Avatar required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImg = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) throw ApiError(400, "Avatar upload failed")

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImg?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (! createdUser) throw new ApiError(500, "Problem on server side ,\n try again later")

    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registation done successfull")
    )

})


export {registerUser}