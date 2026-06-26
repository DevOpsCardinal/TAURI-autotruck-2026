import { createContext, useContext } from 'react';
import { AuthContextValue } from '../features/auth/types/auth.types';

const AuthContext = createContext<AuthContextValue>({
  auth: undefined,
  license: null,
  accessToken: null,
  refreshToken: null,
  login: () => undefined,
  logout: () => undefined,
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export default AuthContext;
