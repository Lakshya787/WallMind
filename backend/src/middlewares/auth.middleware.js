import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const authMiddleware = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Get token from cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2️⃣ If no token → Unauthorized
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token"
      });
    }

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Get user (without password)
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // 5️⃣ Optional: block unverified users
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified"
      });
    }

    // 6️⃣ Attach user to request
    req.user = user;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed"
    });
  }
};
