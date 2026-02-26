/**
 * Onboarding API router
 */

import { Router } from "express";
import { onboardController } from "./onboarding.controller";

const router = Router();

/**
 * POST /onboard
 * Accept user information and generate mutations for user.md
 */
router.post("/onboard", onboardController);

export default router;
