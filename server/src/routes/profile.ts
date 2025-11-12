import { Router, Request, Response } from 'express';
import { UserModel } from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileSchema } from '../validation/schemas';

const router = Router();

const asyncHandler = (fn: (req: Request | AuthRequest, res: Response) => Promise<any>) => {
  return (req: Request | AuthRequest, res: Response, next: any) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
};

// Route pour récupérer le profil de l'utilisateur authentifié
router.get('/me', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.user?.id);
    if (!user) {
      console.log('Utilisateur non trouvé pour /me avec ID:', req.user?.id);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    console.log('Données utilisateur renvoyées par /api/profile/me:', user.stats?.totalEvents);
    res.json(user);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil /me:', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
}));

// Route pour récupérer le profil d'un utilisateur par son ID (pour les organisateurs qui veulent voir le profil d'un humoriste)
router.get('/:userId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
}));

router.put('/:userId', authMiddleware, validate(updateProfileSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    if (req.user?.id !== userId) {
      return res.status(403).json({ message: 'Non autorisé à modifier ce profil' });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.email) user.email = updateData.email;
    if (updateData.city) user.city = updateData.city;
    if (updateData.phone) user.phone = updateData.phone;
    if (updateData.address) user.address = updateData.address;
    if (updateData.gender !== undefined) user.gender = updateData.gender;
    if (updateData.avatarUrl !== undefined) user.avatarUrl = updateData.avatarUrl;

    // Handle comedianProfile updates
    if (user.role === 'COMEDIAN') {
      if (!user.profile) {
        user.profile = {};
      }
      if (updateData.profile) {
        if (updateData.profile.bio !== undefined) user.profile.bio = updateData.profile.bio;
        if (updateData.profile.experience !== undefined) user.profile.experience = updateData.profile.experience;
        if (updateData.profile.speciality !== undefined) user.profile.speciality = updateData.profile.speciality;
        if (updateData.profile.numberOfScenes !== undefined) user.profile.numberOfScenes = updateData.profile.numberOfScenes;
        if (updateData.profile.comedyStyle !== undefined) user.profile.comedyStyle = updateData.profile.comedyStyle;
        if (updateData.profile.performanceLanguages !== undefined) user.profile.performanceLanguages = updateData.profile.performanceLanguages;
        if (updateData.profile.socialLinks) {
          if (!user.profile.socialLinks) user.profile.socialLinks = {};
          if (updateData.profile.socialLinks.youtube !== undefined) user.profile.socialLinks.youtube = updateData.profile.socialLinks.youtube || undefined;
          if (updateData.profile.socialLinks.instagram !== undefined) user.profile.socialLinks.instagram = updateData.profile.socialLinks.instagram || undefined;
          if (updateData.profile.socialLinks.facebook !== undefined) user.profile.socialLinks.facebook = updateData.profile.socialLinks.facebook || undefined;
          if (updateData.profile.socialLinks.twitter !== undefined) user.profile.socialLinks.twitter = updateData.profile.socialLinks.twitter || undefined;
        }
      }
    }

    // Handle organizerProfile updates
    if (user.role === 'ORGANIZER') {
        if (!user.organizerProfile) {
            user.organizerProfile = { location: { city: '', postalCode: '' }, venueTypes: [] };
        }
        if (updateData.organizerProfile) {
        user.organizerProfile = {
          ...user.organizerProfile,
          ...updateData.organizerProfile,
          location: {
            ...user.organizerProfile.location,
            ...updateData.organizerProfile.location,
          },
          averageBudget: {
            ...user.organizerProfile.averageBudget,
            ...updateData.organizerProfile.averageBudget,
            }
        };
        }
        // Gérer le téléphone dans organizerProfile si fourni
        if (updateData.organizerProfile?.phone !== undefined && user.organizerProfile) {
            user.organizerProfile.phone = updateData.organizerProfile.phone;
        }
    }

    await user.save();
    
    // Récupérer l'utilisateur mis à jour avec les profils populés
    const updatedUser = await UserModel.findById(userId)
      .select('-password')
      .populate('profile')
      .populate('organizerProfile');
    
    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil', error: error.message });
  }
}));

export default router; 