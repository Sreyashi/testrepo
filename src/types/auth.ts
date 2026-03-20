export interface User {
  id: string;
  name: string;
  email: string;
  token: string; // unique token embedded in the magic login link
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
}
