import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";


export const verifyJWT = asyncHandler(async (req, res, next)=>{

    try {
        const token =  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token) throw new ApiError(401, "Unauthorize request")
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        console.log(user)
    
        if (!user) throw new ApiError(401, "invalid access toen")
    
        req.user = user
        //now i can access this user from req. in logout function
        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "In valid accessToken , i am in catch block")
    }

})