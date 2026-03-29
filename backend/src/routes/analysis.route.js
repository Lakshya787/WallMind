import express from "express";
import {
  createAnalysis,
  getAllAnalyses,
  getAnalysisById,
  deleteAnalysis
} from "../controllers/analysis.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const analysisRouter = express.Router();

// POST → create analysis  (multer errors caught inline → clean JSON 400)
analysisRouter.post(
  "/",
  authMiddleware,
  (req, res, next) => {
    upload.single("floor_plan")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }
      next();
    });
  },
  createAnalysis
);

// GET → all analyses
analysisRouter.get(
  "/",
  authMiddleware,
  getAllAnalyses
);

// GET → one analysis
analysisRouter.get(
  "/:id",
  authMiddleware,
  getAnalysisById
);

// DELETE → remove analysis
analysisRouter.delete(
  "/:id",
  authMiddleware,
  deleteAnalysis
);

export default analysisRouter;