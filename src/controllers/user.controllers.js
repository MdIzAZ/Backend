import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validationBeforeSave: false})

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Error in server side , unable to generate Token\n")
    }
}


const registerUser = asyncHandler(async(req, res)=>{
    
    const {fullName, email, username, password} = req.body
    console.log(email)

    //validation 1
    if ([fullName, email, username, password].some((f)=>
        f?.trim() === ""
    )) {
        throw new ApiError(400, "All fields are required")
    }

    //validation 2
    const isUserAlreadyExists = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserAlreadyExists) {
        throw new ApiError(409, "username or email already take. Try another one")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    console.log(avatarLocalPath)

    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    console.log(coverImageLocalPath)

    if (! avatarLocalPath) {
        throw new ApiError(400, "Avatar required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImg = await uploadOnCloudinary(coverImageLocalPath)
    console.log(avatar)

    if (!avatar) {throw new ApiError(400, "Avatar upload failed")}

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


const loginUser = asyncHandler(async(req, res)=>{

    const {email, username, password} = req.body

    if(!(username || email)) throw new ApiError(400, "email or username is missing")

    //finding if user is registered
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if ( !user ) throw new ApiError(404, "No user exists with this emial or usename, register first")

    //password check 
    const isPasswordValid = await user.isPasswordCorrect(password)
    if ( !isPasswordValid ) throw new ApiError(401, "Incorrect password")

    //token generation
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken: accessToken, refreshToken: refreshToken
                },
                "User LoggedIn Successfully"
            )
        )
        

})


const logOutUser = asyncHandler(async(req, res)=>{
    // user is set to req body by middleware ( auth )
    const userId = req.user._id
    await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                refreshToken : undefined
            }
        },
        {
            new: true // it will give user object after modification
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "user loged out")
        )
})


const refreshAccessToken = asyncHandler(async(req, res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) new ApiError(401, "Unauthorized request")

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if (!user) new ApiError(401, "Invalid Refresh Token")
        if (incomingRefreshToken !== user?.refreshToken) new ApiError(401, "Refresh Token is expired or used")
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(
                200, 
                {accessToken, refreshToken},
                "Access token refreshed"
            ))

    } catch (error) {
        throw new ApiError(401, error?.message || "i am in catch block of refreshOfAccess token")
    }

})


const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect =  user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) throw new ApiError(401, "old password is incorrect")

    user.password = newPassword
    await user.save({validationBeforeSave: false})
    //now hook will be call userSchema.pre("save")

    return res.status(200)
        .json(new ApiResponse(
            200,
            {},
            "Password changed successfully"
        ))

})


const getCurrentUser = asyncHandler(async(req, res)=>{

    return res.status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "current user fetched"
        ))

})


const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullName, email} = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "both full name and username is required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")


    return res.status(200)
        .json(new ApiResponse(
            200,
            user,
            "Account details updated successfully"
        ))

})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const localPath = req.file?.path

    if(!localPath) throw new ApiError(400, "Avatar missing")

    const avatar = await uploadOnCloudinary(localPath)
    if (!avatar.url) {
        throw new ApiError(400, "Problem on uploading image ")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {  $set : { avatar: avatar.url }  },
        {new : true}
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(
            200,
            user,
            "Avatar updated successfully"
        ))

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const localPath = req.file?.path

    if(!localPath) throw new ApiError(400, "Cover Image file missing")

    const coverImage = await uploadOnCloudinary(localPath)
    if (!coverImage.url) {
        throw new ApiError(400, "Problem on uploading image ")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {  $set : { coverImage: coverImage.url }  },
        {new : true}
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(
            200,
            user,
            "Cover Image updated successfully"
        ))

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params

    if (! username?.trim()) throw new ApiError(400, "username is missing")

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
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
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName:1,
                username:1,
                subscribersCount:1,
                subscribedToCount:1,
                isSubscribed:1,
                avatar: 1, 
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (! channel?.length) throw new ApiError(404, "No channel found, with this username")

    return res.status(200)
        .json(
            new ApiResponse(200, channel[0]), "Channel Details"
        )

    console.log(channel)
})



export {
    registerUser, 
    loginUser, 
    logOutUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}
