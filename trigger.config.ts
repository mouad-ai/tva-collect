import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";
import { logServerError } from "./lib/error-logging";

export default defineConfig({
  // Set this to your actual project ref from the Trigger.dev dashboard
  // (Project settings → Project ref) before running `npx trigger.dev deploy`.
  project: process.env.TRIGGER_PROJECT_REF || "proj_replace_me",
  dirs: ["./trigger"],
  build: {
    // Without this, Trigger.dev's bundler doesn't know to copy Prisma's
    // native query engine binary alongside the bundled task code, so the
    // deployed tasks fail at runtime even though the local build succeeds
    // and `binaryTargets` in schema.prisma is correct.
    extensions: [prismaExtension({ schema: "prisma/schema.prisma", mode: "legacy" })]
  },
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 30000,
      factor: 2
    }
  },
  // Without this, a task that fails all 3 retries just sits quietly in the
  // Trigger.dev dashboard — nobody's watching that. Route it through the
  // same ALERT_WEBHOOK_URL every other server error in this app already
  // uses, so a broken lead-sourcing run or a dead Claude API key actually
  // gets noticed instead of the pipeline silently going stale for days.
  onFailure: async ({ task, payload, error }) => {
    // `task` here is the task's id string directly (TaskFailureHookParams),
    // not an object with an .id property.
    await logServerError({
      error: error instanceof Error ? error : new Error(String(error)),
      metadata: { context: "trigger-dev-task-failure", taskId: task, payload: JSON.stringify(payload).slice(0, 2000) }
    });
  }
});
