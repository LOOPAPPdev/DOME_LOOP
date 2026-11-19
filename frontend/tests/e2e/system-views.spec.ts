import { expect, test } from "@playwright/test"
import axe from "axe-core"

const systemPath = "/projects/demo-project/systems/SYS-DEMO-001"

test("navigates the canonical routes and shares an edited demo revision", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator(".demo-banner")).toContainText("No account, live backend")
  await expect(page.getByRole("heading", { name: /Trace the mechanism/i })).toBeVisible()

  await page.getByRole("link", { name: "Browse projects" }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.locator("h1")).toBeFocused()
  await expect(page).toHaveTitle("Projects — LOOP Dynamics")
  await page.getByRole("link", { name: "Open system" }).click()
  await expect(page).toHaveURL(new RegExp(`${systemPath}/app$`))
  await expect(page.locator("h1")).toHaveAttribute("lang", "pt")

  const nameField = page.getByRole("textbox", { name: "System name" })
  await nameField.fill("Queue service — revised demo")
  await page.getByRole("button", { name: "Save local demo revision" }).click()
  await expect(page.getByText("Local demo revision saved in this tab. No backend was called.")).toBeVisible()
  await expect(page.getByText("local revision r2")).toBeVisible()
  await expect(page).toHaveTitle("Queue service — revised demo — LOOP Dynamics")

  await page.getByRole("link", { name: "Infographic" }).click()
  await expect(page).toHaveURL(new RegExp(`${systemPath}/infographic$`))
  await expect(page.getByRole("heading", { name: "Queue service — revised demo" })).toBeVisible()
  await expect(page.getByText(/READ ONLY.*revision r2/)).toBeVisible()
  await expect(page.getByRole("textbox", { name: "System name" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Save local demo revision/ })).toHaveCount(0)

  const reportNode = page.locator(".react-flow__node").first()
  await expect(reportNode).not.toHaveClass(/draggable/)
  const sourceHandle = reportNode.locator(".react-flow__handle.source")
  await expect(sourceHandle).not.toHaveClass(/\bconnectable\b/)
  const originalTransform = await reportNode.evaluate((element) => (element as HTMLElement).style.transform)
  const nodeBox = await reportNode.boundingBox()
  if (!nodeBox) throw new Error("Read-only report graph node has no bounding box")
  await page.mouse.move(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(nodeBox.x + nodeBox.width / 2 + 100, nodeBox.y + nodeBox.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  await expect.poll(() => reportNode.evaluate((element) => (element as HTMLElement).style.transform)).toBe(originalTransform)
  const beforeConnectCount = await page.locator(".react-flow__edge").count()
  const targetHandle = page.locator(".react-flow__node").nth(1).locator(".react-flow__handle.target")
  const sourceBox = await sourceHandle.boundingBox()
  const targetBox = await targetHandle.boundingBox()
  if (!sourceBox || !targetBox) throw new Error("Read-only report connection handles have no bounding box")
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect(page.locator(".react-flow__edge")).toHaveCount(beforeConnectCount)

  await page.getByRole("link", { name: "Tutorial" }).click()
  await expect(page).toHaveURL(new RegExp(`${systemPath}/tutorial$`))
  await expect(page.getByText(/READ ONLY.*revision r2/)).toBeVisible()
  await expect(page.getByRole("textbox", { name: "System name" })).toHaveCount(0)
})

test("supports graph text alternative, 320px reflow and axe in both themes @a11y", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  for (const theme of ["light", "dark"]) {
    await page.goto("/settings")
    await page.getByRole("combobox", { name: "Theme preference" }).selectOption(theme)
    await page.goto(`${systemPath}/app`)
    await page.getByText("Text alternative: variables and relationships").click()
    await expect(page.getByRole("heading", { name: "Variables" })).toBeVisible()
    await expect(page.getByRole("button", { name: /V01: Taxa de chegadas/ })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
    await page.addScriptTag({ content: axe.source })
    const results = await page.evaluate(async () => {
      const axeApi = (window as Window & { axe?: { run: (context: Document) => Promise<{ violations: Array<{ id: string; impact: string; help: string }> }> } }).axe
      if (!axeApi) throw new Error("axe-core did not load")
      return axeApi.run(document)
    })
    expect(results.violations.map((violation) => `${theme} ${violation.id}: ${violation.help}`)).toEqual([])
  }
})

test("serves every canonical route directly and after reload", async ({ page }) => {
  const routes = [
    { path: "/", heading: "Trace the mechanism before proposing an intervention." },
    { path: "/projects", heading: "Projects" },
    { path: `${systemPath}/app`, heading: "Fila de atendimento (demonstração fictícia)" },
    { path: `${systemPath}/infographic`, heading: "Fila de atendimento (demonstração fictícia)" },
    { path: `${systemPath}/tutorial`, heading: "Fila de atendimento (demonstração fictícia): guided walkthrough" },
    { path: "/projects/demo-project/runs/demo-run", heading: "Run trace" },
    { path: "/knowledge", heading: "Knowledge and sources" },
    { path: "/settings", heading: "Preferences" },
  ]

  for (const route of routes) {
    await page.goto(route.path)
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible()
    await expect(page).toHaveTitle(`${route.heading} — LOOP Dynamics`)
    await page.reload()
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible()
  }

  await page.goto("/this-route-does-not-exist")
  await expect(page.getByRole("heading", { name: "This page is unavailable" })).toBeVisible()
})

test("collapses primary navigation on mobile and restores it with keyboard-accessible state", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto("/")
  const menuButton = page.getByRole("button", { name: "Open menu" })
  const navigation = page.getByRole("navigation", { name: "Primary navigation" })
  await expect(menuButton).toBeVisible()
  await expect(menuButton).toHaveAttribute("aria-expanded", "false")
  await expect(navigation).toBeHidden()
  await menuButton.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true")
  await expect(navigation).toBeVisible()
  await navigation.getByRole("link", { name: "Projects" }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.locator("h1")).toBeFocused()
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false")
  await expect(navigation).toBeHidden()
})

test("cross-highlights evidence-linked graph claims without changing their status", async ({ page }) => {
  await page.goto(`${systemPath}/app`)
  await expect(page.getByText("Evidence EV-001 is highlighted on linked variables and relationships.")).toBeVisible()
  await expect(page.locator(".react-flow__node.evidence-linked")).toHaveCount(4)
  await expect(page.locator(".react-flow__edge.evidence-linked")).toHaveCount(4)
  await expect(page.getByText("hypothesis", { exact: true }).first()).toBeVisible()
  await expect(page.getByRole("button", { name: /EV-001 assumption · unverified/ })).toHaveAttribute("aria-pressed", "true")
})

test("shows the selected relationship in the read-only infographic inspector", async ({ page }) => {
  await page.goto(`${systemPath}/infographic`)
  await page.getByText("Text alternative: variables and relationships").click()
  const relationship = page.getByRole("button", { name: /Taxa de chegadas to Tamanho da fila/ })
  await relationship.click()
  await expect(relationship).toHaveAttribute("aria-pressed", "true")
  const inspector = page.getByRole("complementary", { name: "System inspector" })
  await expect(inspector.getByText("SELECTED RELATIONSHIP")).toBeVisible()
  await expect(inspector.getByText("+ · hypothesis", { exact: true })).toBeVisible()
  await expect(inspector.getByText("Delay: none")).toBeVisible()
  await expect(inspector.getByText("Evidence: EV-001")).toBeVisible()
  await expect(inspector.getByText("Observar se chegadas adicionais aumentam a fila quando a taxa de atendimento é mantida constante.")).toBeVisible()
  await expect(inspector.getByText("SELECTED VARIABLE")).toHaveCount(0)
  const variable = page.getByRole("button", { name: /V01: Taxa de chegadas/ })
  await variable.click()
  await expect(variable).toHaveAttribute("aria-pressed", "true")
  await expect(inspector.getByText("SELECTED VARIABLE")).toBeVisible()
  await expect(inspector.getByText("SELECTED RELATIONSHIP")).toHaveCount(0)
})

test("keeps primary navigation and graph selection operable by keyboard", async ({ page }) => {
  await page.goto(`${systemPath}/app`)
  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator("#main-content")).toBeFocused()

  const graphAlternative = page.getByText("Text alternative: variables and relationships")
  await graphAlternative.focus()
  await page.keyboard.press("Enter")
  const firstVariable = page.getByRole("button", { name: /V01: Taxa de chegadas/ })
  await expect(firstVariable).toBeVisible()
  await firstVariable.focus()
  await page.keyboard.press("Enter")
  await expect(firstVariable).toHaveAttribute("aria-pressed", "true")
  const firstRelationship = page.getByRole("button", { name: /Taxa de chegadas to Tamanho da fila/ })
  await firstRelationship.focus()
  await page.keyboard.press("Enter")
  await expect(firstRelationship).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("SELECTED RELATIONSHIP")).toBeVisible()
  await expect(page.getByText("Delay: none")).toBeVisible()
})

test("supports System, Light and Dark local theme preferences", async ({ page }) => {
  await page.goto("/settings")
  const themeSelect = page.getByRole("combobox", { name: "Theme preference" })
  await themeSelect.selectOption("dark")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("loop-theme"))).toBe("dark")
  expect(await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor)).toBe("rgb(11, 17, 24)")
  await page.goto(`${systemPath}/app`)
  const darkEdgeText = page.locator(".react-flow__edge-text").first()
  const darkEdgeBackground = page.locator(".react-flow__edge-textbg").first()
  await expect(darkEdgeText).toBeVisible()
  expect(await darkEdgeText.evaluate((element) => getComputedStyle(element).fill)).toBe("rgb(168, 210, 255)")
  expect(await darkEdgeBackground.evaluate((element) => getComputedStyle(element).fill)).toBe("rgb(18, 28, 39)")
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--loop-graph-edge").trim())).toBe("#84b7f3")
  expect(await page.locator(".react-flow__edge-path").first().evaluate((element) => getComputedStyle(element).stroke)).toBe("rgb(159, 202, 255)")
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--loop-node-border").trim())).toBe("#64748b")
  expect(await page.locator(".causal-node").first().evaluate((element) => getComputedStyle(element).borderTopColor)).toBe("rgb(143, 194, 255)")
  expect(await page.locator(".flow-handle").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(132, 183, 243)")
  const darkZoomControlBoxes = await page.locator(".react-flow__controls-button").evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect()
    return { width: box.width, height: box.height }
  }))
  expect(darkZoomControlBoxes.length).toBeGreaterThan(0)
  expect(darkZoomControlBoxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(true)

  await page.goto("/settings")
  await page.getByRole("combobox", { name: "Theme preference" }).selectOption("light")
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
  expect(await page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor)).toBe("rgb(250, 250, 250)")
  await page.goto(`${systemPath}/app`)
  const lightEdgeText = page.locator(".react-flow__edge-text").first()
  const lightEdgeBackground = page.locator(".react-flow__edge-textbg").first()
  await expect(lightEdgeText).toBeVisible()
  expect(await lightEdgeText.evaluate((element) => getComputedStyle(element).fill)).toBe("rgb(6, 69, 168)")
  expect(await lightEdgeBackground.evaluate((element) => getComputedStyle(element).fill)).toBe("rgb(255, 255, 255)")
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--loop-graph-edge").trim())).toBe("#466b9a")
  expect(await page.locator(".react-flow__edge-path").first().evaluate((element) => getComputedStyle(element).stroke)).toBe("rgb(4, 108, 254)")
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--loop-node-border").trim())).toBe("#75869b")
  expect(await page.locator(".causal-node").first().evaluate((element) => getComputedStyle(element).borderTopColor)).toBe("rgb(4, 108, 254)")
  expect(await page.locator(".flow-handle").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(70, 107, 154)")
  const lightZoomControlBoxes = await page.locator(".react-flow__controls-button").evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect()
    return { width: box.width, height: box.height }
  }))
  expect(lightZoomControlBoxes.length).toBeGreaterThan(0)
  expect(lightZoomControlBoxes.every((box) => box.width >= 44 && box.height >= 44)).toBe(true)

  await page.goto("/settings")
  await page.getByRole("combobox", { name: "Theme preference" }).selectOption("system")
  await expect(page.locator("html")).toHaveAttribute("data-theme-preference", "system")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.emulateMedia({ colorScheme: "light" })
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
})

test("runs axe on every canonical route and expanded mobile navigation in both themes @a11y", async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 320, height: 800 })
  const paths = [
    "/",
    "/projects",
    `${systemPath}/app`,
    `${systemPath}/infographic`,
    `${systemPath}/tutorial`,
    "/projects/demo-project/runs/demo-run",
    "/knowledge",
    "/settings",
  ]

  for (const theme of ["light", "dark"]) {
    await page.goto("/settings")
    await page.getByRole("combobox", { name: "Theme preference" }).selectOption(theme)
    for (const path of paths) {
      await page.goto(path)
      await expect(page.locator("h1")).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
      await page.addScriptTag({ content: axe.source })
      const violations = await page.evaluate(async () => {
        const axeApi = (window as Window & { axe?: { run: (context: Document) => Promise<{ violations: Array<{ id: string; impact: string; help: string }> }> } }).axe
        if (!axeApi) throw new Error("axe-core did not load")
        return axeApi.run(document)
      })
      expect(violations.violations.map((item) => `${theme} ${path} ${item.id}: ${item.help}`)).toEqual([])
    }

    await page.goto("/")
    await page.getByRole("button", { name: "Open menu" }).click()
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible()
    await page.addScriptTag({ content: axe.source })
    const menuViolations = await page.evaluate(async () => {
      const axeApi = (window as Window & { axe?: { run: (context: Document) => Promise<{ violations: Array<{ id: string; impact: string; help: string }> }> } }).axe
      if (!axeApi) throw new Error("axe-core did not load")
      return axeApi.run(document)
    })
    expect(menuViolations.violations.map((item) => `${theme} expanded mobile navigation ${item.id}: ${item.help}`)).toEqual([])
  }
})
