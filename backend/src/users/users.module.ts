import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersRepository } from './repositories/users.repository.js';
import { UserEntity, UserSchema } from './schemas/user.schema.js';
import { UsersService } from './services/users.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
  ],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
