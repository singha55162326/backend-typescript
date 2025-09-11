import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user has admin role
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user?.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'ບໍ່ໄດ້ຮັບອະນຸຍາດ: ສະເພາະ ຜູ້ດູແລລະບົບ ເທົ່ານັ້ນ',
    });
  }
  return next();
};

/**
 * Middleware to check if user has stadium owner or admin role
 */
export const requireStadiumOwnerOrAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user?.role !== 'superadmin' && user?.role !== 'stadium_owner') {
    return res.status(403).json({
      success: false,
      message: 'ບໍ່ໄດ້ຮັບອະນຸຍາດ: ສະເພາະ ເຈົ້າຂອງສະໜາມ ຫຼື ຜູ້ດູແລລະບົບ ເທົ່ານັ້ນ',
    });
  }
  return next();
};