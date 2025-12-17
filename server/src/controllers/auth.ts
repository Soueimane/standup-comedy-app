import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { PasswordResetRequestModel } from '../models/PasswordResetRequest';
import { config } from '../config/env';
import { AuthRequest } from '../middleware/auth';
import sgMail from '@sendgrid/mail';
import { emitUserRegistered, emitPasswordReset } from '../services/eventEmitter';

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

    // Émettre un événement SSE pour notifier tous les clients
    emitUserRegistered(user._id.toString());

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

    // Si l'utilisateur n'existe pas ou le mot de passe est invalide,
    // renvoyer le même message pour ne pas révéler si l'email existe
    if (!user) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
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

// ============================================================================
// FORGOT PASSWORD - Demander une réinitialisation
// ============================================================================
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }

    // Trouver l'utilisateur
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    
    // Pour la sécurité, on ne révèle pas si l'email existe ou non
    if (!user) {
      return res.status(200).json({
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
      });
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure

    // Créer ou mettre à jour la demande de réinitialisation
    await PasswordResetRequestModel.findOneAndUpdate(
      { userId: user._id, status: 'pending' },
      {
        userId: user._id,
        email: user.email,
        resetToken,
        expiresAt,
        requestedAt: new Date(),
        status: 'pending'
      },
      { upsert: true, new: true }
    );

    // Envoyer l'email de réinitialisation à l'utilisateur
    const resetUrl = `${config.frontend.url}/reset-password?token=${resetToken}`;
    
    sgMail.setApiKey(config.email.smtpPass);
    await sgMail.send({
      from: {
        email: config.email.smtpUser || '',
        name: 'Comedy Connect Club'
      },
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #fff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #ff416c; margin-bottom: 20px;">🔐 Réinitialisation de mot de passe</h2>
            <p>Bonjour ${user.firstName},</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
            <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(to right, #ff416c, #ff4b2b); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            
            <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
              <strong>⚠️ Important :</strong> Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </p>
            
            <p style="color: #999; font-size: 0.85em; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br/>
              <span style="word-break: break-all; color: #ff416c;">${resetUrl}</span>
            </p>
            
            <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
              Cordialement,<br/>
              L'équipe Comedy Connect Club
            </p>
          </div>
        </div>
      `,
      text: `Bonjour ${user.firstName},\n\nVous avez demandé à réinitialiser votre mot de passe.\n\nCliquez sur ce lien pour créer un nouveau mot de passe : ${resetUrl}\n\nCe lien expire dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez cet email.\n\nCordialement,\nL'équipe Comedy Connect Club`
    });

    console.log(`✅ Email de réinitialisation envoyé à ${user.email}`);

    res.status(200).json({
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé à votre adresse email.'
    });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation' });
  }
};

// ============================================================================
// RESET PASSWORD - Réinitialiser avec un token
// ============================================================================
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    // Trouver la demande de réinitialisation
    const resetRequest = await PasswordResetRequestModel.findOne({
      resetToken: token,
      status: 'pending'
    });

    if (!resetRequest || resetRequest.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Token invalide ou expiré' });
    }

    // Trouver l'utilisateur
    const user = await UserModel.findById(resetRequest.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Mettre à jour le mot de passe
    user.password = password;
    await user.save();

    // Marquer la demande comme complétée
    resetRequest.status = 'completed';
    resetRequest.completedAt = new Date();
    await resetRequest.save();

    res.status(200).json({
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
};

// ============================================================================
// GET PASSWORD RESET REQUESTS - Pour Super Admin
// ============================================================================
export const getPasswordResetRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const requests = await PasswordResetRequestModel.find({
      status: 'pending'
    })
      .populate('userId', 'firstName lastName email role')
      .populate('requestedBy', 'firstName lastName email')
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      requests: requests.map(req => ({
        id: req._id,
        userId: req.userId,
        email: req.email,
        requestedAt: req.requestedAt,
        expiresAt: req.expiresAt,
        requestedBy: req.requestedBy,
        status: req.status
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des demandes' });
  }
};

// ============================================================================
// ADMIN RESET PASSWORD - Super Admin réinitialise le mot de passe
// ============================================================================
export const adminResetPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.status(400).json({ message: 'userId et newPassword requis' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    // Trouver l'utilisateur
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    // Émettre un événement SSE pour notifier tous les clients
    emitPasswordReset(userId);

    // Marquer toutes les demandes en attente comme complétées
    await PasswordResetRequestModel.updateMany(
      { userId: user._id, status: 'pending' },
      {
        status: 'completed',
        completedAt: new Date(),
        completedBy: req.user.id
      }
    );

    // Envoyer un email à l'utilisateur avec son nouveau mot de passe
    try {
      sgMail.setApiKey(config.email.smtpPass);
      await sgMail.send({
        from: {
          email: config.email.smtpUser || '',
          name: 'Comedy Connect Club'
        },
        to: user.email,
        subject: '🔐 Votre mot de passe a été réinitialisé',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: #fff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #ff416c; margin-bottom: 20px;">🔐 Mot de passe réinitialisé</h2>
              <p>Bonjour ${user.firstName},</p>
              <p>Votre demande de réinitialisation de mot de passe a été traitée par un administrateur.</p>
              
              <div style="background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #856404;">⚠️ Important : Conservez ce mot de passe en sécurité</p>
                <p style="margin: 10px 0 0 0; font-size: 1.2em; color: #000; font-family: monospace; word-break: break-all;">
                  <strong>Votre nouveau mot de passe :</strong><br/>
                  ${newPassword}
                </p>
              </div>
              
              <p style="margin-top: 25px;">Vous pouvez maintenant vous connecter avec ce nouveau mot de passe :</p>
              <a href="${config.frontend.url}/login" style="display: inline-block; padding: 12px 24px; background: #ff416c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">
                Se connecter
              </a>
              
              <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                <strong>Conseil de sécurité :</strong> Nous vous recommandons de changer ce mot de passe après votre première connexion pour un mot de passe que vous seul connaissez.
              </p>
              
              <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
                Cordialement,<br/>
                L'équipe Comedy Connect Club
              </p>
            </div>
          </div>
        `,
        text: `Bonjour ${user.firstName},\n\nVotre demande de réinitialisation de mot de passe a été traitée par un administrateur.\n\nVotre nouveau mot de passe : ${newPassword}\n\nVous pouvez maintenant vous connecter avec ce nouveau mot de passe.\n\nConseil de sécurité : Nous vous recommandons de changer ce mot de passe après votre première connexion.\n\nCordialement,\nL'équipe Comedy Connect Club`
      });
      console.log(`✅ Email envoyé à ${user.email} avec le nouveau mot de passe`);
    } catch (emailError) {
      console.error('❌ Erreur lors de l\'envoi de l\'email à l\'utilisateur:', emailError);
      // Ne pas faire échouer la réinitialisation si l'email échoue
    }

    res.status(200).json({
      message: `Mot de passe réinitialisé avec succès pour ${user.firstName} ${user.lastName}. Un email a été envoyé à l'utilisateur.`
    });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation admin:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
  }
};
