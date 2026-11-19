(() => {
  const allowed = new Set(["system", "light", "dark"])
  let preference = "system"
  try {
    const stored = window.localStorage.getItem("loop-theme")
    if (stored && allowed.has(stored)) preference = stored
  } catch {
    // Storage can be disabled; system preference remains a safe default.
  }
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  const resolved = preference === "system" ? (systemDark ? "dark" : "light") : preference
  document.documentElement.dataset.theme = resolved
  document.documentElement.dataset.themePreference = preference
  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute("content", resolved === "dark" ? "#0b1118" : "#fafafa")
})()
