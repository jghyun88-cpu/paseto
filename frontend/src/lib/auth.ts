/** 인증 관련 타입 정의 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  team: string;
  role_title: string | null;
  is_active: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}
