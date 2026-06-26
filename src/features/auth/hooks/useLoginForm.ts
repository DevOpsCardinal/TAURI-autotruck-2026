import { useRef, useState } from 'react';
import { login, isLoginError } from '../services/auth.service';
import { FieldErrors, LoginResponse } from '../types/auth.types';

interface UseLoginFormOptions {
  onSuccess: (response: LoginResponse) => void;
}

interface UseLoginFormReturn {
  username: string;
  password: string;
  showPassword: boolean;
  isLoading: boolean;
  fieldErrors: FieldErrors;
  globalError: string | null;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  handleUsernameChange: (value: string) => void;
  handlePasswordChange: (value: string) => void;
  handleUsernameBlur: () => void;
  handlePasswordBlur: () => void;
  handleUsernameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTogglePassword: () => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export function useLoginForm({ onSuccess }: UseLoginFormOptions): UseLoginFormReturn {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  function validateUsername(value: string): string | undefined {
    if (!value.trim()) return 'El usuario es requerido';
    if (value.trim().length < 3) return 'El usuario debe tener al menos 3 caracteres';
    return undefined;
  }

  function validatePassword(value: string): string | undefined {
    if (!value) return 'La contraseña es requerida';
    if (value.length < 4) return 'La contraseña debe tener al menos 4 caracteres';
    return undefined;
  }

  // Limpiar el error al escribir es intencional: la validación ocurre en onBlur
  // y en submit, no mientras el usuario tipea (evita mensajes prematuros).
  function handleUsernameChange(value: string) {
    setUsername(value);
    if (fieldErrors.username) {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  }

  function handleUsernameBlur() {
    const error = validateUsername(username);
    setFieldErrors((prev) => ({ ...prev, username: error }));
  }

  function handlePasswordBlur() {
    const error = validatePassword(password);
    setFieldErrors((prev) => ({ ...prev, password: error }));
  }

  function handleUsernameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      passwordInputRef.current?.focus();
    }
  }

  function handleTogglePassword() {
    setShowPassword((prev) => !prev);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);

    const usernameError = validateUsername(username);
    const passwordError = validatePassword(password);
    setFieldErrors({ username: usernameError, password: passwordError });

    if (usernameError || passwordError) return;

    setIsLoading(true);

    const result = await login({ username: username.trim(), password });

    setIsLoading(false);

    if (isLoginError(result)) {
      setPassword('');
      setGlobalError(result.message);
      passwordInputRef.current?.focus();
      return;
    }

    onSuccess(result);
  }

  return {
    username,
    password,
    showPassword,
    isLoading,
    fieldErrors,
    globalError,
    passwordInputRef,
    handleUsernameChange,
    handlePasswordChange,
    handleUsernameBlur,
    handlePasswordBlur,
    handleUsernameKeyDown,
    handleTogglePassword,
    handleSubmit,
  };
}
