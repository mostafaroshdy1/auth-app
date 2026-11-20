import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, trusted, Types } from 'mongoose';
import {
  toRefreshState,
  toRevokedSession,
  toSession,
} from '../mappers/session.mapper.js';
import {
  type ExpiryRecord,
  expiryFields,
  type RotationRecord,
  rotationFields,
  sessionFields,
  type SessionRecord,
} from '../schemas/session.projections.js';
import { SessionEntity } from '../schemas/session.schema.js';
import type {
  NewSession,
  RefreshState,
  RevokedSession,
  Session,
} from '../types/session.types.js';

@Injectable()
export class SessionsRepository {
  constructor(
    @InjectModel(SessionEntity.name)
    private readonly sessions: Model<SessionEntity>,
  ) {}

  async create({ id, userId, ...data }: NewSession): Promise<void> {
    await this.sessions.create({
      _id: id,
      userId: new Types.ObjectId(userId),
      ...data,
    });
  }

  async findById(id: string): Promise<Session | null> {
    const record = await this.sessions
      .findById(id, sessionFields)
      .lean<SessionRecord>()
      .exec();
    return record && toSession(record);
  }

  async findActiveByUser(userId: string): Promise<Session[]> {
    const records = await this.sessions
      .find(
        { userId: new Types.ObjectId(userId), ...this.activeFilter() },
        sessionFields,
      )
      .sort({ createdAt: -1 })
      .lean<SessionRecord[]>()
      .exec();
    return records.map(toSession);
  }

  async revoke(userId: string, id: string): Promise<Date | null> {
    const record = await this.sessions
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId), revokedAt: null },
        { revokedAt: new Date() },
        { projection: expiryFields },
      )
      .lean<ExpiryRecord>()
      .exec();
    return record?.expiresAt ?? null;
  }

  async advanceRefreshGeneration(
    id: string,
    generation: number,
  ): Promise<RefreshState | null> {
    const record = await this.sessions
      .findOneAndUpdate(
        { _id: id, refreshGeneration: generation, ...this.activeFilter() },
        {
          $inc: { refreshGeneration: 1 },
          $set: { lastRefreshedAt: new Date() },
        },
        { projection: rotationFields, returnDocument: 'after' },
      )
      .lean<RotationRecord>()
      .exec();
    return record && toRefreshState(record);
  }

  async revokeById(id: string): Promise<Date | null> {
    const record = await this.sessions
      .findOneAndUpdate(
        { _id: id, revokedAt: null },
        { revokedAt: new Date() },
        { projection: expiryFields },
      )
      .lean<ExpiryRecord>()
      .exec();
    return record?.expiresAt ?? null;
  }

  async revokeActiveExcept(
    userId: string,
    exceptId: string,
  ): Promise<RevokedSession[]> {
    const filter = {
      userId: new Types.ObjectId(userId),
      _id: trusted({ $ne: exceptId }),
      ...this.activeFilter(),
    };
    const records = await this.sessions
      .find(filter, expiryFields)
      .lean<ExpiryRecord[]>()
      .exec();
    if (records.length === 0) return [];
    const ids = records.map(({ _id }) => _id);
    await this.sessions
      .updateMany(
        { _id: trusted({ $in: ids }), revokedAt: null },
        { revokedAt: new Date() },
      )
      .exec();
    return records.map(toRevokedSession);
  }

  private activeFilter() {
    return { revokedAt: null, expiresAt: trusted({ $gt: new Date() }) };
  }
}
