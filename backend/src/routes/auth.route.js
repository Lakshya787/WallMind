import { Router } from "express";
import { login, logout, signup,verifyEmail } from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/verify-email", verifyEmail);


export default authRouter;

