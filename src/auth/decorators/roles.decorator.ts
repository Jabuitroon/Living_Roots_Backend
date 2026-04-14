import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums';
export const ROLES_KEY = 'roles';
// Para array de strings se puede usar el operador rest
// export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Para un solo string (En este caso se puede usar un enum para evitar errores de tipeo)
export const Roles = (roles: Role) => SetMetadata(ROLES_KEY, roles);
