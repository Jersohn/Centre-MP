export const APP_SETTINGS_KEY = "sgi-app-settings";
export const APP_SETTINGS_CHANGED_EVENT = "sgi-app-settings-changed";

export type AppSettings = {
  darkMode: boolean;
  emailAlerts: boolean;
  autoUpdates: boolean;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  darkMode: false,
  emailAlerts: true,
  autoUpdates: false,
};

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_APP_SETTINGS };
  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) {
      const theme = window.localStorage.getItem("sgi-theme");
      return {
        ...DEFAULT_APP_SETTINGS,
        darkMode: theme === "dark",
      };
    }
    return { ...DEFAULT_APP_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings) {
  if (typeof window === "undefined") return settings;
  window.localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(APP_SETTINGS_CHANGED_EVENT, { detail: settings }));
  return settings;
}
