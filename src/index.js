// require('dotenv').config({path:'./env'})

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`running at port ${process.env.PORT}`);
    });
  })
  .catch((e) => {
    console.error("mongo connection failed", e);
  });

/*
import express from "express"
const app = express()

;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (e)=>{
            console.error("ERROR", e)
            throw e
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`app listening on ${process.env.PORT}`)
        })

    } catch (error) {
        console.error("ERROR", error)
        throw error
    }
}) ()

*/
