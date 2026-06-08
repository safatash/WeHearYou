/**
 * Dev-only smoke test for the automation persistence foundation.
 *
 * Guards:
 *   - NODE_ENV !== "production"
 *   - x-automation-runner-secret header must match AUTOMATION_RUNNER_SECRET
 *     (or AUTOMATION_WEBHOOK_SECRET as fallback)
 *
 * What it tests:
 *   1. Manual enrollment path — SEND_REQUEST step fires immediately, creating a
 *      Campaign, AutomationStepExecution with campaignId, and setting
 *      AutomationRun.completedAt.
 *   2. Delayed job path — DELAY→SEND_REQUEST creates a pending AutomationJob and a
 *      "scheduled" AutomationStepExecution.  After back-dating the job's executeAt,
 *      executePendingAutomationJobs() updates the execution to "executed" and
 *      closes the run.
 *
 * Cleanup: all test records are deleted in a finally block.
 *
 * Usage:
 *   curl -s -X POST http://localhost:3000/api/automation/smoke-test \
 *        -H "x-automation-runner-secret: <secret>" | jq
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeManualEnrollment, executePendingAutomationJobs } from "@/lib/automation-engine";
import { timingSafeEqual } from "node:crypto";
import { AutomationTriggerType, AutomationStepType, ContactSource, CampaignStatus } from "@prisma/client";

function checkSecret(req: NextRequest): boolean {
  const expected = process.env.AUTOMATION_RUNNER_SECRET || process.env.AUTOMATION_WEBHOOK_SECRET;
  if (!expected) return false;
  const provided = req.headers.get("x-automation-runner-secret") ?? "";
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const cleanup: string[] = []; // IDs of test automation records to delete

  // ── Helper to assert ──────────────────────────────────────────────────────
  function assert(label: string, condition: boolean, detail?: unknown) {
    if (!condition) throw new Error(`FAIL [${label}]: ${JSON.stringify(detail)}`);
    results[label] = "PASS";
  }

  try {
    // ── Seed test org / location / contact ───────────────────────────────────
    const org = await prisma.organization.create({
      data: { name: "__smoke_test_org__", slug: `smoke-${Date.now()}` },
    });
    cleanup.push(org.id); // deleting org cascades everything

    const location = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: "Smoke Test Location",
        slug: `smoke-loc-${Date.now()}`,
        city: "Testville",
        state: "TS",
        status: "active",
      },
    });

    const contact = await prisma.contact.create({
      data: {
        locationId: location.id,
        name: "Smoke Test Contact",
        email: `smoke-${Date.now()}@example.com`,
        source: ContactSource.MANUAL,
      },
    });

    // ── TEST 1: Immediate manual enrollment ──────────────────────────────────
    const automation1 = await prisma.automation.create({
      data: {
        organizationId: org.id,
        name: "__smoke_manual__",
        triggerType: AutomationTriggerType.MANUAL_ENROLLMENT,
        isActive: true,
        steps: {
          create: [{
            stepType: AutomationStepType.SEND_REQUEST,
            title: "Smoke send",
            orderIndex: 0,
            configJson: { channel: "EMAIL" },
          }],
        },
      },
    });

    const result1 = await executeManualEnrollment({
      automationId: automation1.id,
      contactId: contact.id,
      organizationId: org.id,
    });

    assert("manual_enrollment.returns_runId", typeof result1.automationRunId === "string");
    assert("manual_enrollment.returns_campaignId", typeof result1.campaignId === "string");
    assert("manual_enrollment.step_executed", result1.stepsExecuted[0]?.status === "executed");

    const run1 = await prisma.automationRun.findUniqueOrThrow({ where: { id: result1.automationRunId } });
    assert("manual_enrollment.run_status_completed", run1.status === "completed");
    assert("manual_enrollment.run_completedAt_set", run1.completedAt !== null, run1.completedAt);

    const executions1 = await prisma.automationStepExecution.findMany({
      where: { automationRunId: result1.automationRunId },
    });
    assert("manual_enrollment.step_execution_created", executions1.length === 1);
    assert("manual_enrollment.step_execution_status_executed", executions1[0].status === "executed");
    assert("manual_enrollment.step_execution_campaignId_set", executions1[0].campaignId === result1.campaignId);
    assert("manual_enrollment.step_execution_completedAt_set", executions1[0].completedAt !== null);

    const campaign1 = await prisma.campaign.findUniqueOrThrow({ where: { id: result1.campaignId! } });
    assert("manual_enrollment.campaign_automationRunId_set", campaign1.automationRunId === result1.automationRunId);
    assert("manual_enrollment.campaign_status_sent", campaign1.status === CampaignStatus.SENT);

    // ── TEST 2: Delayed job path ─────────────────────────────────────────────
    const automation2 = await prisma.automation.create({
      data: {
        organizationId: org.id,
        name: "__smoke_delayed__",
        triggerType: AutomationTriggerType.MANUAL_ENROLLMENT,
        isActive: true,
        steps: {
          create: [
            { stepType: AutomationStepType.DELAY,        title: "Wait 1h",     orderIndex: 0, configJson: { delayHours: "1" } },
            { stepType: AutomationStepType.SEND_REQUEST, title: "Delayed send", orderIndex: 1, configJson: { channel: "EMAIL" } },
          ],
        },
      },
    });

    const result2 = await executeManualEnrollment({
      automationId: automation2.id,
      contactId: contact.id,
      organizationId: org.id,
    });

    assert("delayed.returns_runId", typeof result2.automationRunId === "string");
    assert("delayed.stepsExecuted_has_scheduled", result2.stepsExecuted.some((s) => s.status === "scheduled"));

    const run2pre = await prisma.automationRun.findUniqueOrThrow({ where: { id: result2.automationRunId } });
    assert("delayed.run_status_scheduled", run2pre.status === "scheduled");
    assert("delayed.run_completedAt_null", run2pre.completedAt === null);

    const exec2pre = await prisma.automationStepExecution.findFirst({
      where: { automationRunId: result2.automationRunId },
    });
    assert("delayed.step_execution_created_scheduled", exec2pre !== null);
    assert("delayed.step_execution_status_scheduled", exec2pre?.status === "scheduled");
    assert("delayed.step_execution_jobId_set", exec2pre?.automationJobId !== null);

    // Back-date the job so the runner picks it up
    await prisma.automationJob.updateMany({
      where: { automationRunId: result2.automationRunId, status: "pending" },
      data: { executeAt: new Date(Date.now() - 1000) },
    });

    const runnerResult = await executePendingAutomationJobs(10);
    const jobResult = runnerResult.results.find((r) => r.campaignId);

    assert("delayed.runner_executed_at_least_one", runnerResult.processed >= 1);
    assert("delayed.runner_has_campaign", jobResult !== undefined, runnerResult);

    const exec2post = await prisma.automationStepExecution.findFirst({
      where: { automationRunId: result2.automationRunId },
    });
    assert("delayed.step_execution_status_executed", exec2post?.status === "executed");
    assert("delayed.step_execution_campaignId_set", exec2post?.campaignId !== null);
    assert("delayed.step_execution_completedAt_set", exec2post?.completedAt !== null);

    const run2post = await prisma.automationRun.findUniqueOrThrow({ where: { id: result2.automationRunId } });
    assert("delayed.run_status_completed", run2post.status === "completed");
    assert("delayed.run_completedAt_set", run2post.completedAt !== null, run2post.completedAt);

    const campaign2 = await prisma.campaign.findUniqueOrThrow({ where: { id: exec2post!.campaignId! } });
    assert("delayed.campaign_automationRunId_set", campaign2.automationRunId === result2.automationRunId);

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error), results },
      { status: 500 }
    );
  } finally {
    // Delete the test org (cascades location, contact, automations, runs, jobs, executions, campaigns)
    for (const orgId of cleanup) {
      await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    }
  }
}
