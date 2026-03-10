import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Log sécurisé sans inclure les données volumineuses (avatarUrl base64)
    const safeBody = { ...req.body };
    if (safeBody.avatarUrl && typeof safeBody.avatarUrl === 'string' && safeBody.avatarUrl.length > 100) {
      safeBody.avatarUrl = `[base64 image: ${safeBody.avatarUrl.length} chars]`;
    }
    console.log('🔍 [VALIDATION] Validation des données:', Object.keys(req.body));
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