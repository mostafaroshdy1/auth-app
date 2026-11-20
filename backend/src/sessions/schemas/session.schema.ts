import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  collection: 'sessions',
  timestamps: { createdAt: true, updatedAt: false },
})
export class SessionEntity {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'UserEntity',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  revokedAt?: Date;

  @Prop({ required: true, default: 0, min: 0 })
  refreshGeneration: number;

  @Prop()
  lastRefreshedAt?: Date;

  @Prop({ required: true, expires: 0 })
  retainUntil: Date;

  createdAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(SessionEntity);
SessionSchema.index({ userId: 1, expiresAt: -1 });
