import mongoose, { Document, Schema } from 'mongoose';

/**
 * Interface for temporary auth code document
 * Used to exchange a short-lived code for tokens (tokens never exposed in URL)
 */
export interface ITempAuthCode extends Document {
  code: string;
  token: string;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  createdAt: Date;
}

/**
 * Schema for temporary auth code with TTL index
 * Documents are automatically deleted after 30 seconds
 */
const TempAuthCodeSchema = new Schema<ITempAuthCode>({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  token: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: String,
  idToken: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 // TTL: 30 secondes seulement
  }
});

export const TempAuthCodeModel = mongoose.model<ITempAuthCode>('TempAuthCode', TempAuthCodeSchema);
