import mongoose, { Schema, Document, Types } from 'mongoose';

export interface NotificationDocument extends Document {
  user: Types.ObjectId; // Utilisateur destinataire (organisateur)
  type: 'new_application' | 'application_accepted' | 'application_rejected' | 'event_updated' | 'absence_marked' | 'event_cancelled';
  title: string; // Titre de la notification
  message: string; // Message détaillé
  relatedEvent?: Types.ObjectId; // Évènement concerné
  relatedApplication?: Types.ObjectId; // Candidature concernée
  relatedUser?: Types.ObjectId; // Utilisateur concerné (humoriste qui a postulé, etc.)
  read: boolean; // Si la notification a été lue
  readAt?: Date; // Date de lecture
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['new_application', 'application_accepted', 'application_rejected', 'event_updated', 'absence_marked', 'event_cancelled'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  relatedEvent: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    index: true
  },
  relatedApplication: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    index: true
  },
  relatedUser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ relatedEvent: 1 });
notificationSchema.index({ relatedApplication: 1 });

export const NotificationModel = mongoose.model<NotificationDocument>('Notification', notificationSchema);

