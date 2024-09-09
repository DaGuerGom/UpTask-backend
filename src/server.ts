import express from "express";
import dotenv from "dotenv"
import cors from "cors"
import { corsConfig } from "./config/cors";
import { connectDB } from "./config/db";
import projectRoutes from "./routes/projectRoutes"
import authRoutes from "./routes/authRoutes";

dotenv.config()

connectDB()

const app=express()
app.use(cors(corsConfig))
app.use(express.json())

//Routes
app.use("/api/v1/auth",authRoutes)
app.use("/api/v1/projects",projectRoutes)

export default app