export const Permission = {
  UsersRead: 'users:read',
  UsersManage: 'users:manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ADMIN_PERMISSIONS: Permission[] = [
  Permission.UsersRead,
  Permission.UsersManage,
];
