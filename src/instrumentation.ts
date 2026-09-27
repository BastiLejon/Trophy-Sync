export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { seedDemoCatalog } = await import("./lib/seed");
    await seedDemoCatalog();
  }
}
