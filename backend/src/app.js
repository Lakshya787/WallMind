import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

/**
 * =========================
 * CORS CONFIG (ALL ORIGINS ALLOWED FOR HACKATHON/PROD)
 * =========================
 */
app.use(cors({
  origin: function (origin, callback) {
    return callback(null, true); // Extremely permissive: allow all origins
  },
  credentials: true
}));

// handle preflight requests (sometimes needed if cors plugin gets confused)
app.options("*", cors());

/**
 * =========================
 * MIDDLEWARES
 * =========================
 */
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

/**
 * =========================
 * HEALTH CHECK (IMPORTANT)
 * =========================
 */
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

/**
 * =========================
 * ROUTES
 * =========================
 */
import authRouter from "./routes/auth.route.js";
import analysisRouter from "./routes/analysis.route.js";
import paymentRouter from "./routes/payment.route.js";

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/analysis", analysisRouter);
app.use("/api/v1/payment", paymentRouter);

/**
 * =========================
 * ERROR HANDLER (OPTIONAL BUT GOOD)
 * =========================
 */
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

export { app };