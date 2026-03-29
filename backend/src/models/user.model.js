import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
{
  username: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email"]
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  avatar: {
    type: String,
    default: ""
  },

  // 🔥 Project relevance
  projects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project"
    }
  ],

  totalProjects: {
    type: Number,
    default: 0
  },

  lastActive: {
    type: Date,
    default: Date.now
  },

  // 🔐 Security (minimal but useful)
  isVerified: {
    type: Boolean,
    default: false
  },

  resetPasswordToken: String,
  resetPasswordExpiresAt: Date

},
{ timestamps: true }
);


// 🔐 Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// 🔐 Compare password
userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};


export const User = mongoose.model("User", userSchema);