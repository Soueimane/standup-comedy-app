import { Response } from 'express';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/auth';

/**
 * Récupère le profil de l'utilisateur authentifié
 */
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await UserModel.findById(req.user?.id);
    if (!user) {
      console.log('Utilisateur non trouvé pour /me avec ID:', req.user?.id);
      res.status(404).json({ message: 'Utilisateur non trouvé' });
      return;
    }
    console.log('Données utilisateur renvoyées par /api/profile/me:', user.stats?.totalEvents);
    res.json(user);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil /me:', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
};

/**
 * Récupère le profil d'un utilisateur par son ID (pour les organisateurs qui veulent voir le profil d'un humoriste)
 */
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error.message);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
};

/**
 * Met à jour le profil d'un utilisateur avec gestion des profils secondaires (comedianProfile, organizerProfile)
 */
export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    if (req.user?.id !== userId) {
      res.status(403).json({ message: 'Non autorisé à modifier ce profil' });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
      return;
    }

    // Update basic user fields
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
      // Handle phone in organizerProfile if provided
      if (updateData.organizerProfile?.phone !== undefined && user.organizerProfile) {
        user.organizerProfile.phone = updateData.organizerProfile.phone;
      }
    }

    await user.save();

    // Retrieve updated user with profiles populated
    const updatedUser = await UserModel.findById(userId)
      .select('-password')
      .populate('profile')
      .populate('organizerProfile');

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil', error: error.message });
  }
};
