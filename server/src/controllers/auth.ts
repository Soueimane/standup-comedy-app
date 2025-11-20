import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { config } from '../config/env';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, phone, password, firstName, lastName, role, city } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: 'Email déjà utilisé'
      });
    }

    // Créer le profil utilisateur en fonction du rôle
    const profile = role === 'COMEDIAN' ? {
      bio: '',
      experience: 0,
      speciality: '',
      socialLinks: {},
      performances: [],
      numberOfScenes: 0,
      comedyStyle: [],
      performanceLanguages: [],
    } : undefined;

    const organizerProfile = role === 'ORGANIZER' ? {
      companyName: '',
      description: '',
      website: '',
      venueTypes: [],
      eventFrequency: 'monthly',
      location: {
        venue: '',
        address: '',
        city: city || '',
        country: '',
      },
      phone: phone || '',
    } : undefined;

    // Créer un nouvel utilisateur
    const user = new UserModel({
      email,
      phone: phone || '',
      password,
      firstName,
      lastName,
      role,
      city: city || '',
      ...(profile && { profile }),
      ...(organizerProfile && { organizerProfile }),
    });

    await user.save();

    // Générer le token JWT
    if (!config.jwt.secret) {
      return res.status(500).json({
        message: 'Erreur de configuration du serveur'
      });
    }

    const tokenOptions: SignOptions = { expiresIn: '24h' };
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      config.jwt.secret as string,
      tokenOptions
    );

    // Formater la réponse en fonction du rôle
    const userResponse: any = {
      id: user._id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      city: user.city,
    };

    if (role === 'COMEDIAN' && user.profile) {
      userResponse.profile = user.profile;
    } else if (role === 'ORGANIZER' && user.organizerProfile) {
      userResponse.organizerProfile = user.organizerProfile;
    }

    res.status(201).json({
      message: 'Utilisateur enregistré avec succès',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'utilisateur' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur par email
    const user = await UserModel.findOne({ email })
      .select('+password')
      .populate('profile')
      .populate('organizerProfile');

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Mot de passe invalide'
      });
    }

    // Générer le token JWT
    if (!config.jwt.secret) {
      return res.status(500).json({
        message: 'Erreur de configuration du serveur'
      });
    }

    const tokenOptions: SignOptions = { expiresIn: '24h' };
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      config.jwt.secret as string,
      tokenOptions
    );

    // Formater la réponse en fonction du rôle
    const userResponse: any = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    if (user.role === 'COMEDIAN' && user.profile) {
      userResponse.profile = user.profile;
    } else if (user.role === 'ORGANIZER' && user.organizerProfile) {
      userResponse.organizerProfile = user.organizerProfile;
    }

    res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        message: 'Utilisateur non authentifié'
      });
    }

    // Récupérer l'utilisateur avec tous les profils
    const user = await UserModel.findById(userId)
      .select('-password')
      .populate('profile')
      .populate('organizerProfile');

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur non trouvé'
      });
    }

    // Construire la réponse en fonction du rôle
    const userResponse: any = {
      id: user._id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      city: user.city,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (user.role === 'COMEDIAN' && user.profile) {
      userResponse.profile = user.profile;
      userResponse.stats = user.stats || {
        applicationsCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        performanceCount: 0,
      };
    } else if (user.role === 'ORGANIZER' && user.organizerProfile) {
      userResponse.organizerProfile = user.organizerProfile;
      userResponse.stats = user.stats || {
        eventsCreated: 0,
        totalApplications: 0,
        totalApplicants: 0,
        acceptedApplications: 0,
      };
    } else if (user.role === 'SUPER_ADMIN') {
      userResponse.stats = user.stats;
    }

    res.status(200).json(userResponse);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;

    // Vérifier l'accès super administrateur
    if (userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        message: 'Seuls les super administrateurs peuvent accéder à cette ressource'
      });
    }

    // Récupérer tous les utilisateurs non administrateurs
    const users = await UserModel.find({
      role: { $in: ['COMEDIAN', 'ORGANIZER'] }
    })
      .select('firstName lastName email phone role city createdAt stats profile organizerProfile')
      .populate('profile')
      .populate('organizerProfile')
      .sort({ createdAt: -1 });

    // Formater les données utilisateur pour la réponse
    const formattedUsers = users.map(user => {
      const baseData = {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.role === 'ORGANIZER'
          ? (user.organizerProfile?.phone || null)
          : (user.phone || null),
        role: user.role,
        city: user.role === 'ORGANIZER'
          ? (user.organizerProfile?.location?.city || user.city || null)
          : (user.city || null),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stats: user.stats || {},
      };

      // Ajouter des données spécifiques au rôle
      if (user.role === 'COMEDIAN' && user.profile) {
        return {
          ...baseData,
          bio: (user.profile as any).bio || '',
          experience: (user.profile as any).experience || 0,
          numberOfScenes: (user.profile as any).numberOfScenes || 0,
        };
      }

      if (user.role === 'ORGANIZER' && user.organizerProfile) {
        return {
          ...baseData,
          companyName: (user.organizerProfile as any).companyName || null,
          description: (user.organizerProfile as any).description || null,
          website: (user.organizerProfile as any).website || null,
        };
      }

      return baseData;
    });

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
};
