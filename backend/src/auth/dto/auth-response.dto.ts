import { z } from 'zod';

export const authOptionsResponseSchema = z.object({ adminSignup: z.boolean() });
