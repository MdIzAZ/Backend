import mongoose from "mongoose";
import { Schema } from "mongoose";

const subscriptionSchema = new Schema(
    {
        subscriber: {
            type: Schema.Types.ObjectId,
            ref: "Users",
        },
        channel: {
            type: Schema.Types.ObjectId,
            ref: "Users",
        }
    },
    {timestamps: true}
)

export const Subscription = new mongoose.model("Subscription", subscriptionSchema)