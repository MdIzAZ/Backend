import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import JWT from "jsonwebtoken";
import { User } from "../models/user.models";


export const verifyJWT = asyncHandler(async (req, res, next)=>{

    try {
        const token =  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token) throw new ApiError(401, "Unaothorize request")
    
        const decodedToken = JWT.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) throw new ApiError(401, "invalid access token")
    
        //now i can access this user from req. in logout function
        req.user = user
        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "In valid accessToken , i am in catch block")
    }

})