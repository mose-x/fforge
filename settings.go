package main

import (
	"fforge/internal/config"
)

// GetSettings returns the current application settings. Bound to the frontend
// (Settings dialog loads these on mount).
func (a *App) GetSettings() config.AppSettings {
	return a.settings.Get()
}

// SaveSettings persists the settings. Bound to the frontend (Settings dialog
// calls this on every field change, optimistic).
func (a *App) SaveSettings(settings config.AppSettings) error {
	return a.settings.Update(settings)
}
