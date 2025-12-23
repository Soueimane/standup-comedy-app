import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('🔍 [VALIDATION] Validation des données:', JSON.stringify(req.body, null, 2));
    const validatedData = await schema.parseAsync(req.body);
    console.log('✅ [VALIDATION] Données validées avec succès');
    req.body = validatedData; // Utiliser les données validées (avec transformations appliquées)
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('❌ [VALIDATION] Erreur de validation:', error.errors);
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
    }
    console.error('❌ [VALIDATION] Erreur inconnue:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}; 