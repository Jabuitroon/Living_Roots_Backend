import { Role } from '@app/auth/enums';

export interface User {
  id: number;
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}
