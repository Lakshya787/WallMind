import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

/**
 * =========================
 * CORS CONFIG (SAFE + WORKING)
 * =========================
 */
const allowedOrigins = [
  "http://localhost:5173",
  "https://wall-mind.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // ❗ DO NOT throw error → just block silently
    return callback(null, false);
  },
  credentials: true
}));

// handle preflight requests
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