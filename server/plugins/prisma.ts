import { disconnectPrisma } from "../../lib/prisma.server";
import { definePlugin } from "nitro";

export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook("close", async () => {
    await disconnectPrisma();
  });
});
