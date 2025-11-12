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
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    // Créer un nouveau profil utilisateur
    const profile = {
      bio: '',
      experience: 0,
      speciality: '',
      socialLinks: {},
      performances: []
    };

    // Créer le nouvel utilisateur
    const user = new UserModel({
      email,
      phone: phone || '',
      password,
      firstName,
      lastName,
      role,
      city: city || '',
      profile
    });

    await user.save();

    // Générer le token JWT
    if (!config.jwt.secret) {
      console.error('JWT_SECRET is not defined in environment variables.');
      res.status(500).json({ message: 'Server configuration error.' });
      return;
    }
    const options: SignOptions = { expiresIn: 86400 }; // 24 heures en secondes
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role }, // Ajouter le rôle au payload JWT
      config.jwt.secret as string,
      options
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        city: user.city,
        ...(user.role === 'COMEDIAN' && { profile: user.profile }),
        ...(user.role === 'ORGANIZER' && { organizerProfile: user.organizerProfile }),
      }
    });
  } catch (error) {
    console.error('Registration error details:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Générer le token JWT
    if (!config.jwt.secret) {
      console.error('JWT_SECRET is not defined in environment variables.');
      res.status(500).json({ message: 'Server configuration error.' });
      return;
    }
    const options: SignOptions = { expiresIn: 86400 }; // 24 heures en secondes
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role }, // Ajouter le rôle au payload JWT
      config.jwt.secret as string,
      options
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        ...(user.role === 'COMEDIAN' && { profile: user.profile }),
        ...(user.role === 'ORGANIZER' && { organizerProfile: user.organizerProfile }),
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    // Assurez-vous de sélectionner tous les champs nécessaires, y compris les profils spécifiques
    const user = await UserModel.findById(userId)
      .select('-password') // Exclure le mot de passe
      .populate('profile') // Populer le profil humoriste
      .populate('organizerProfile'); // Populer le profil organisateur
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const userResponse = {
      id: user._id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      city: user.city, // Assurez-vous d'inclure la ville
      // Inclure le profil spécifique en fonction du rôle
      ...(user.role === 'COMEDIAN' && { profile: user.profile }),
      ...(user.role === 'ORGANIZER' && { organizerProfile: user.organizerProfile }),
      stats: user.stats, // Inclure les stats
    };

    res.json(userResponse);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error getting profile' });
  }
};

// GET /api/auth/users - Récupérer tous les utilisateurs (SUPER_ADMIN seulement)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    console.log('🔍 [DEBUG] getAllUsers - Début de la fonction');
    const userRole = (req as any).user?.role;
    const userId = (req as any).user?.id;
    
    console.log('👤 [DEBUG] Utilisateur qui fait la requête:', { userId, userRole });
    
    // Vérifier que c'est un super admin
    if (userRole !== 'SUPER_ADMIN') {
      console.log('❌ [DEBUG] Accès refusé - Role:', userRole);
      return res.status(403).json({ message: 'Accès refusé. Seuls les super administrateurs peuvent accéder à cette ressource.' });
    }

    console.log('🔍 Super Admin - Récupération de tous les utilisateurs');

    // Récupérer tous les utilisateurs sauf les super admins
    const users = await UserModel.find({ 
      role: { $in: ['COMEDIAN', 'ORGANIZER'] } 
    })
    .select('firstName lastName email phone role city createdAt stats profile organizerProfile') // Sélection explicite des champs
    .populate('profile')
    .populate('organizerProfile')
    .sort({ createdAt: -1 }); // Trier par date de création (plus récents en premier)

    console.log(`📊 Utilisateurs trouvés: ${users.length}`);

    // Formater les données pour le frontend
    const formattedUsers = users.map(user => ({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.role === 'ORGANIZER' 
        ? (user.organizerProfile?.phone || 'Non renseigné')
        : (user.phone || 'Non renseigné'),
      role: user.role,
      city: (user.organizerProfile && user.organizerProfile.location && user.organizerProfile.location.city) || user.city || 'Non renseigné',
      createdAt: user.createdAt,
      stats: user.stats || {}, // Inclure les statistiques
      // Informations spécifiques selon le rôle
      ...(user.role === 'COMEDIAN' && user.profile && {
        stageName: (user.profile as any).stageName || 'Non renseigné',
        experienceLevel: (user.profile as any).experienceLevel || 'Non renseigné'
      }),
      ...(user.role === 'ORGANIZER' && user.organizerProfile && {
        companyName: (user.organizerProfile as any).companyName || 'Non renseigné'
      })
    }));

    res.json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
}; 