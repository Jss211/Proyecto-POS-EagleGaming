import { navigationGroups } from "@/routes/erp-navigation"

export const sidebarStorageKey = "eaglegaming.sidebar.open-groups.v1"

export function initialOpenGroups(selectedId: string): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(sidebarStorageKey) ?? "null")
    if (Array.isArray(stored) && stored.every(value => typeof value === "string")) {
      return navigationGroups.filter(group => stored.includes(group.title)).map(group => group.title)
    }
  } catch {
    // Navigation remains available when storage is blocked or malformed.
  }
  return navigationGroups.filter(group => group.modules.some(module => module.id === selectedId)).map(group => group.title)
}

export function toggleOpenGroup(openGroups: string[], title: string): string[] {
  return openGroups.includes(title) ? openGroups.filter(group => group !== title) : [...openGroups, title]
}
