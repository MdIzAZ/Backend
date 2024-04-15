import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"

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
    // res.status(200).json({
    //     message: "ok izaz"
    // })
    
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

    if(!username || ! email) throw new ApiError(400, "email or username is missing")

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if ( !user ) throw new ApiError(404, "No user exists with this emial or usename")

    const isPasswordValid = await user.isPasswordCorrect(password)
    if ( !isPasswordValid ) throw new ApiError(401, "Incorrect password")

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
    const userId = req.user._id
    await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                refreshToken : undefined
            }
        },
        {
            new: true
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



export {registerUser, loginUser, logOutUser}
