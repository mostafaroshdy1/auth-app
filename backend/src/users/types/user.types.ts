import type { Permission } from '../constants/permissions.js';

export interface User {
  id: string;
  email: string;
  name: string;
  permissions: Permission[];
  createdAt: Date;
}

export interface UserCredentials {
  user: User;
  passwordHash: string;
}

export interface NewUser {
  email: string;
  name: string;
  passwordHash: string;
  permissions: Permission[];
}
