import mongoose, { Schema, Document } from 'mongoose';

export interface PasswordResetRequestDocument extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  resetToken: string;
  expiresAt: Date;
  requestedAt: Date;
  requestedBy?: mongoose.Types.ObjectId; // Super Admin qui a initié la demande
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId; // Super Admin qui a complété
}

const passwordResetRequestSchema = new Schema<PasswordResetRequestDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  resetToken: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // Auto-suppression après expiration
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'expired', 'cancelled'],
    default: 'pending'
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index pour les requêtes fréquentes
passwordResetRequestSchema.index({ email: 1, status: 1 });
passwordResetRequestSchema.index({ resetToken: 1 });
passwordResetRequestSchema.index({ userId: 1 });

export const PasswordResetRequestModel = mongoose.model<PasswordResetRequestDocument>(
  'PasswordResetRequest',
  passwordResetRequestSchema
);

