export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionConfig } = await import("./lib/env");
    assertProductionConfig();
    const { seedDemoCatalog } = await import("./lib/seed");
    await seedDemoCatalog();
  }
}
