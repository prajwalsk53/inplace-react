// Backfills the richer provider fields (added in the provider_fidelity migration) that
// import-dump.js couldn't populate because the models didn't have those columns yet:
// ProviderEvaluation sub-ratings, ProviderIssue desiredOutcome/resolvedAt,
// PlacementOpportunity's extra fields, and PlacementNotification (new model).

const { PrismaClient } = require('@prisma/client');
const { loadTable } = require('./parse-dump');

const DUMP_DIR = 'C:/Users/DELL/OneDrive/Documents/dumps/Dump20260706';
const prisma = new PrismaClient();
const toDate = (v) => (v ? new Date(v) : null);

async function main() {
  console.log('Target DB:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  const placementIds = new Set((await prisma.placement.findMany({ select: { id: true } })).map((p) => p.id));
  const placementCompany = new Map((await prisma.placement.findMany({ select: { id: true, companyId: true } })).map((p) => [p.id, p.companyId]));
  const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));
  const companyIds = new Set((await prisma.company.findMany({ select: { id: true } })).map((c) => c.id));

  // ---- ProviderEvaluation full fields ----
  const evals = loadTable(DUMP_DIR, 'inplace_db_provider_evaluations.sql', [
    'id', 'placement_id', 'provider_user_id', 'eval_period', 'attendance', 'punctuality', 'professionalism',
    'technical_skills', 'communication', 'initiative', 'overall_rating', 'strengths', 'areas_for_improvement',
    'additional_comments', 'recommend_future', 'created_at', 'updated_at',
  ]);
  let evalCount = 0;
  for (const e of evals) {
    if (!placementIds.has(e.placement_id) || !userIds.has(e.provider_user_id)) continue;
    const subratings = [e.attendance, e.punctuality, e.professionalism, e.technical_skills, e.communication, e.initiative].filter((v) => v != null);
    const rating = e.overall_rating ?? (subratings.length ? Math.round(subratings.reduce((a, b) => a + b, 0) / subratings.length) : 3);
    await prisma.providerEvaluation.upsert({
      where: { id: e.id },
      update: {
        evalPeriod: e.eval_period || 'ad_hoc',
        attendance: e.attendance, punctuality: e.punctuality, professionalism: e.professionalism,
        technicalSkills: e.technical_skills, communication: e.communication, initiative: e.initiative,
        rating,
        strengths: e.strengths || null,
        areasForImprovement: e.areas_for_improvement || null,
        additionalComments: e.additional_comments || null,
        recommendFuture: e.recommend_future != null ? e.recommend_future === 1 : null,
      },
      create: {
        id: e.id,
        placementId: e.placement_id,
        companyId: placementCompany.get(e.placement_id),
        evaluatedById: e.provider_user_id,
        evalPeriod: e.eval_period || 'ad_hoc',
        attendance: e.attendance, punctuality: e.punctuality, professionalism: e.professionalism,
        technicalSkills: e.technical_skills, communication: e.communication, initiative: e.initiative,
        rating,
        strengths: e.strengths || null,
        areasForImprovement: e.areas_for_improvement || null,
        additionalComments: e.additional_comments || null,
        recommendFuture: e.recommend_future != null ? e.recommend_future === 1 : null,
        createdAt: toDate(e.created_at),
        updatedAt: toDate(e.updated_at) || toDate(e.created_at),
      },
    });
    evalCount++;
  }
  console.log(`Backfilled ${evalCount} provider evaluations`);

  // ---- ProviderIssue extra fields ----
  const issues = loadTable(DUMP_DIR, 'inplace_db_provider_issues.sql', [
    'id', 'placement_id', 'provider_user_id', 'issue_type', 'severity', 'description', 'desired_outcome',
    'status', 'tutor_response', 'resolved_at', 'created_at', 'updated_at',
  ]);
  let issueCount = 0;
  for (const i of issues) {
    if (!placementIds.has(i.placement_id) || !userIds.has(i.provider_user_id)) continue;
    await prisma.providerIssue.update({
      where: { id: i.id },
      data: { desiredOutcome: i.desired_outcome || null, resolvedAt: toDate(i.resolved_at) },
    }).catch(() => {});
    issueCount++;
  }
  console.log(`Backfilled ${issueCount} provider issues`);

  // ---- PlacementOpportunity full fields ----
  const opps = loadTable(DUMP_DIR, 'inplace_db_placement_opportunities.sql', [
    'id', 'company_id', 'posted_by', 'title', 'description', 'requirements', 'salary_range', 'start_date_est',
    'duration_months', 'positions', 'skills_required', 'is_active', 'deadline', 'created_at', 'updated_at',
  ]);
  let oppCount = 0;
  for (const o of opps) {
    if (!companyIds.has(o.company_id)) continue;
    await prisma.placementOpportunity.update({
      where: { id: o.id },
      data: {
        postedById: userIds.has(o.posted_by) ? o.posted_by : null,
        description: o.description || null,
        requirements: o.requirements || null,
        salaryRange: o.salary_range || null,
        startDateEst: toDate(o.start_date_est),
        durationMonths: o.duration_months || null,
        skillsRequired: o.skills_required || null,
        deadline: toDate(o.deadline),
      },
    }).catch(() => {});
    oppCount++;
  }
  console.log(`Backfilled ${oppCount} placement opportunities`);

  // ---- PlacementNotification (new model, wasn't imported at all before) ----
  const notifs = loadTable(DUMP_DIR, 'inplace_db_placement_notifications.sql', [
    'id', 'placement_id', 'provider_user_id', 'notification_type', 'effective_date', 'reason', 'details',
    'status', 'created_at',
  ]);
  let notifCount = 0;
  for (const n of notifs) {
    if (!placementIds.has(n.placement_id) || !userIds.has(n.provider_user_id)) continue;
    await prisma.placementNotification.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        placementId: n.placement_id,
        companyId: placementCompany.get(n.placement_id),
        raisedById: n.provider_user_id,
        notificationType: n.notification_type,
        effectiveDate: toDate(n.effective_date),
        reason: n.reason,
        details: n.details || null,
        status: n.status || 'pending',
        createdAt: toDate(n.created_at),
      },
    });
    notifCount++;
  }
  console.log(`Backfilled ${notifCount} placement notifications`);

  for (const t of ['ProviderEvaluation', 'ProviderIssue', 'PlacementOpportunity', 'PlacementNotification']) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1));`
    );
  }
  console.log('Sequences resynced. Backfill complete.');
}

main().catch((err) => { console.error('BACKFILL FAILED:', err); process.exit(1); }).finally(() => prisma.$disconnect());
