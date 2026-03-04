import { invoke } from "@tauri-apps/api/core";

export interface AuthStatus {
  is_first_run: boolean;
  is_locked: boolean;
  biometric_enabled: boolean;
  rate_limited: boolean;
  rate_limit_seconds: number;
}

export interface SecuritySettings {
  biometric_enabled: boolean;
  auto_lock_minutes: number;
}

export const getAuthStatus = () =>
  invoke<AuthStatus>("get_auth_status");

export const setupPassword = (password: string) =>
  invoke<void>("setup_password", { password });

export const unlockWithPassword = (password: string) =>
  invoke<void>("unlock_with_password", { password });

export const unlockWithBiometric = () =>
  invoke<void>("unlock_with_biometric");

export const lockApp = () =>
  invoke<void>("lock_app");

export const enableBiometric = (password: string) =>
  invoke<void>("enable_biometric", { password });

export const disableBiometric = () =>
  invoke<void>("disable_biometric");

export const changePassword = (oldPassword: string, newPassword: string) =>
  invoke<void>("change_password", { oldPassword, newPassword });

export const getSecuritySettings = () =>
  invoke<SecuritySettings>("get_security_settings");

export const updateSecuritySettings = (autoLockMinutes: number) =>
  invoke<void>("update_security_settings", { autoLockMinutes });

export const resetAllDataWithWipe = () =>
  invoke<void>("reset_all_data_with_wipe");
