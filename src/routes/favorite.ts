import { Router } from "express";
import { body } from "express-validator";
import { FavoriteController } from "../controllers";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.post(
  "/",
  authenticateToken,
  [body("stadiumId").trim()],
  FavoriteController.createFavoriteController
);

router.get(
  "/",
  authenticateToken,
  FavoriteController.getFavoritesController
);

router.delete(
  "/:stadiumId",
  authenticateToken,
  FavoriteController.deleteFavoriteController
);

// router.get('/', FavoriteController.getAllFaqsController);

export default router;
