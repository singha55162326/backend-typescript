import { Request, Response, NextFunction } from "express";
import { Favorite } from "../models/Favorite.model";
import mongoose from "mongoose";

export class FavoriteController {
  // ✅ Create a favorite
  static async createFavoriteController(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
       const userId = req.user?.userId;

      const { stadiumId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(stadiumId)) {
        res.status(400).json({ success: false, message: "Invalid stadiumId" });
        return;
      }

      const existingFavorite = await Favorite.findOne({ userId, stadiumId });
      if (existingFavorite) {
        res.status(400).json({ success: false, message: "Already favorited" });
        return;
      }

      const favorite = await Favorite.create({ userId, stadiumId });

      res.status(201).json({
        success: true,
        message: "Favorite added successfully",
        favorite,
      });
    } catch (error) {
      console.error("Error creating favorite:", error);
      next(error);
    }
  }


  static async getFavoritesController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const favorites = await Favorite.find({ userId }).populate("stadiumId");
      res.status(200).json({
        success: true,
        message: "Favorites retrieved successfully",
        data: favorites,
      });
    } catch (error) {
      console.error("Error getting favorites:", error);
      next(error);
    }
  }


  static async deleteFavoriteController(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { stadiumId } = req.params;
      const favorite = await Favorite.findOneAndDelete({ userId, stadiumId });
      if (!favorite) {
        res.status(404).json({ success: false, message: "Favorite not found" });
        return;
      }
      res.status(200).json({
        success: true,
        message: "Favorite deleted successfully",
        favorite,
      });
    } catch (error) {
      console.error("Error deleting favorite:", error);
      next(error);
    }
  }

}
