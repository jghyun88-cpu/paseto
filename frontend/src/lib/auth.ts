/** 인증 관련 타입 정의 */

import type { UserRole, UserTeam } from "@/lib/types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: UserTeam;
  role_title: string | null;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}
