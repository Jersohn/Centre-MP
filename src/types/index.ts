export type UserRole = "admin" | "centre" | "chapitre" | "district" | "groupe";

export interface LandingData {
  title: string;
  description: string;
  image: string;
  date?: string;
  author?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
