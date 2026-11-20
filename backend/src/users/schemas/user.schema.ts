import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Permission } from '../constants/permissions.js';

@Schema({ collection: 'users', timestamps: true })
export class UserEntity {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: [String], enum: Object.values(Permission), default: [] })
  permissions: Permission[];

  createdAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);
