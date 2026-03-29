import { User } from "../models/user.model.js";
import crypto from "crypto";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendEmail } from "../services/email.service.js";


/* =================================
   HELPER — hash a raw token
================================= */

const hashToken = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");


/* =================================
   SIGNUP
================================= */

export const signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // validation — fullname removed, not in schema
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // raw token sent to user, hashed token stored in DB
    // schema field is resetPasswordToken — reused here for email verification
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(rawToken);

    const user = await User.create({
      email,
      password,
      username,
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24h
    });

    const verificationURL =
      `${process.env.FRONTEND_URL}/api/v1/auth/verify-email?token=${rawToken}`;

    // respond immediately, send email in background
    res.status(201).json({
      success: true,
      message: "User created. Verify your email."
    });

    sendEmail({
      to: user.email,
      subject: "Verify Your Email",
      html: `
        <h2>Email Verification</h2>
        <p>Hello ${username},</p>
        <p>Click below to verify:</p>
        <a href="${verificationURL}">Verify Email</a>
        <p>Expires in 24 hours</p>
      `,
      text: `Verify your email: ${verificationURL}`
    }).catch(err => console.error("Email error:", err.message));

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


/* =================================
   LOGIN
================================= */

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required"
      });
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Verify your email first"
      });
    }

    // lastActive matches the schema field (was lastLogin before)
    user.lastActive = new Date();
    await user.save();

    generateTokenAndSetCookie(res, user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,         // fullname removed
        avatar: user.avatar,
        totalProjects: user.totalProjects
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"  // never leak error.message in prod
    });
  }
};


/* =================================
   LOGOUT
================================= */

export const logout = async (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    });

    res.status(200).json({
      success: true,
      message: "Logged out"
    });

  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


/* =================================
   VERIFY EMAIL
================================= */

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token missing"
      });
    }

    // hash the incoming raw token, then look up the stored hash
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    user.isVerified = true;
    user.resetPasswordToken = undefined;     // clear after use
    user.resetPasswordExpiresAt = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified"
    });

  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};