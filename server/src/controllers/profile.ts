import { Response } from 'express';
import { Buffer } from 'buffer';
import { UserModel } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { emitProfileUpdated } from '../services/eventEmitter';

const buildAvatarDataUrl = (user: any): string | undefined => {
  if (user?.avatar?.data) {
    const contentType = user.avatar.contentType || 'image/png';
    const base64 = user.avatar.data.toString('base64');
    return `data:${contentType};base64,${base64}`;
  }
  return user?.avatarUrl || undefined;
};

/**
 * Récupère le profil de l'utilisateur authentifié
 */
export const getMyProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const user = await UserModel.findById(req.user?.id);
    if (!user) {
      console.log('Utilisateur non trouvé pour /me avec ID:', req.user?.id);
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    console.log('Données utilisateur renvoyées par /api/profile/me:', user.stats?.totalEvents);

    // Transform the response to include 'id' instead of just '_id' for consistency with JWT token
    const userObj = user.toObject ? user.toObject() : user;
    const responseData = {
      ...userObj,
      id: user._id,
      avatarUrl: buildAvatarDataUrl(userObj),
    };
    if ('avatar' in responseData) {
      delete (responseData as any).avatar;
    }

    return res.json(responseData);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil /me:', error.message);
    return res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
};

/**
 * Récupère le profil d'un utilisateur par son ID (pour les organisateurs qui veulent voir le profil d'un humoriste)
 */
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Transform the response to include 'id' for consistency
    const userObj = user.toObject ? user.toObject() : user;
    const responseData = {
      ...userObj,
      id: user._id,
      avatarUrl: buildAvatarDataUrl(userObj),
    };
    if ('avatar' in responseData) {
      delete (responseData as any).avatar;
    }

    return res.json(responseData);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error.message);
    return res.status(500).json({ message: 'Erreur lors de la récupération du profil', error: error.message });
  }
};

/**
 * Met à jour le profil d'un utilisateur avec gestion des profils secondaires (comedianProfile, organizerProfile)
 */
export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    console.log('📝 [updateUserProfile] Données reçues:', {
      userId,
      updateDataKeys: Object.keys(updateData),
      updateData: JSON.stringify(updateData, null, 2)
    });

    if (req.user?.id !== userId) {
      res.status(403).json({ message: 'Non autorisé à modifier ce profil' });
      return;
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
      return;
    }

    console.log('👤 Utilisateur trouvé, avant mise à jour:', {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone
    });

    // Update basic user fields
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.email) user.email = updateData.email;
    if (updateData.city) user.city = updateData.city;
    if (updateData.phone) user.phone = updateData.phone;
    if (updateData.address) user.address = updateData.address;
    if (updateData.gender !== undefined) user.gender = updateData.gender;
    if (updateData.avatarUrl !== undefined) {
      if (updateData.avatarUrl === null || updateData.avatarUrl === '') {
        user.avatarUrl = undefined;
        (user as any).avatar = undefined;
      } else if (typeof updateData.avatarUrl === 'string' && updateData.avatarUrl.startsWith('data:image/')) {
        const matches = updateData.avatarUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const [, contentType, base64Data] = matches;
          (user as any).avatar = {
            data: Buffer.from(base64Data, 'base64'),
            contentType,
            uploadedAt: new Date(),
          };
          user.avatarUrl = undefined;
        } else {
          user.avatarUrl = updateData.avatarUrl;
          (user as any).avatar = undefined;
        }
      } else {
        user.avatarUrl = updateData.avatarUrl;
        (user as any).avatar = undefined;
      }
    }

    console.log('✏️ Utilisateur après mise à jour des champs:', {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone
    });

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

    console.log('💾 Tentative de sauvegarde...');
    await user.save();
    console.log('✅ Utilisateur sauvegardé avec succès');

    // Émettre un événement SSE pour notifier tous les clients
    emitProfileUpdated(userId);

    // Retrieve updated user with profiles populated
    const updatedUser = await UserModel.findById(userId)
      .select('-password')
      .populate('profile')
      .populate('organizerProfile');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé après mise à jour' });
    }

    // Transform the response to include 'id' for consistency
    const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
    const responseData = {
      ...userObj,
      id: updatedUser._id,
      avatarUrl: buildAvatarDataUrl(userObj),
    };
    if ('avatar' in responseData) {
      delete (responseData as any).avatar;
    }

    return res.json(responseData);
  } catch (error: any) {
    console.error('❌ Erreur validation/sauvegarde:', {
      message: error.message,
      name: error.name,
      errors: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value
      })) : null
    });
    return res.status(500).json({
      message: 'Erreur lors de la mise à jour du profil',
      error: error.message,
      errors: error.errors ? Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      })) : null
    });
  }
};
