import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  SerializeOptions,
} from '@nestjs/common';
import { CurrentSession } from '../../auth/decorators/current-session.decorator.js';
import { uuidSchema } from '../../common/validation/ids.schema.js';
import {
  revokeOthersResponseSchema,
  sessionResponseSchema,
} from '../dto/session-response.dto.js';
import { SessionsService } from '../services/sessions.service.js';
import type { ActiveSession } from '../types/session.types.js';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ schema: sessionResponseSchema })
  list(@CurrentSession() current: ActiveSession) {
    return this.sessions.listForUser(current.userId, current.id);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @SerializeOptions({ schema: revokeOthersResponseSchema })
  revokeOthers(@CurrentSession() current: ActiveSession) {
    return this.sessions.revokeOthers(current.userId, current.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentSession() current: ActiveSession,
    @Param('id', { schema: uuidSchema }) id: string,
  ) {
    await this.sessions.revoke(current.userId, id);
  }
}
