// Imports the real MySQL dump (C:\Users\DELL\OneDrive\Documents\dumps\Dump20260706)
// into the Postgres database pointed to by DATABASE_URL, replacing all existing data.
//
// Usage: node scripts/import-dump.js
//   (set DATABASE_URL / DIRECT_URL in the environment before running to target
//    local dev vs production)

const { PrismaClient } = require('@prisma/client');
const { loadTable } = require('./parse-dump');

const DUMP_DIR = 'C:/Users/DELL/OneDrive/Documents/dumps/Dump20260706';
const prisma = new PrismaClient();

const ROLE_MAP = { student: 'STUDENT', tutor: 'TUTOR', provider: 'PROVIDER', admin: 'ADMIN', director: 'DIRECTOR' };
const APPROVAL_MAP = { pending: 'PENDING', approved: 'APPROVED', rejected: 'REJECTED' };
const PLACEMENT_STATUS_MAP = {
  draft: 'DRAFT', submitted: 'SUBMITTED', awaiting_provider: 'AWAITING_PROVIDER', awaiting_tutor: 'AWAITING_TUTOR',
  approved: 'APPROVED', rejected: 'REJECTED', active: 'ACTIVE', completed: 'COMPLETED', terminated: 'TERMINATED',
};
const CR_STATUS_MAP = { pending_provider: 'PENDING_PROVIDER', pending_tutor: 'PENDING_TUTOR', approved: 'APPROVED', rejected: 'REJECTED' };

const toBool = (v) => v === 1 || v === true;
const toDate = (v) => (v ? new Date(v) : null);
const parseFileSize = (v) => {
  if (!v) return null;
  const m = String(v).match(/[\d.]+/);
  return m ? Math.round(parseFloat(m[0]) * 1024) : null;
};

async function wipeAll() {
  const tables = [
    'AnnouncementRead', 'Announcement', 'Notification', 'Message', 'AuditLog', 'PasswordReset', 'OtpCode',
    'ProviderIssue', 'ProviderEvaluation', 'ProviderMeeting', 'ProviderToken', 'PlacementChangeRequest',
    'Document', 'Reflection', 'Visit', 'PlacementOpportunity', 'Placement', 'SystemSetting', 'User', 'Company',
  ];
  for (const t of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;`);
  }
  console.log('Wiped all tables.');
}

async function fixSequence(table) {
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1));`
  );
}

async function main() {
  console.log('Target DB:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  await wipeAll();

  // ---- Company ----
  const companies = loadTable(DUMP_DIR, 'inplace_db_companies.sql', [
    'id', 'name', 'address', 'city', 'postcode', 'sector', 'website', 'contact_name', 'contact_email',
    'contact_phone', 'latitude', 'longitude', 'created_at',
  ]);
  await prisma.company.createMany({
    data: companies.map((c) => ({
      id: c.id,
      name: c.name,
      address: [c.address, c.postcode].filter(Boolean).join(', ') || null,
      city: c.city || null,
      sector: c.sector || null,
      website: c.website || null,
      contactName: c.contact_name || null,
      contactEmail: c.contact_email || null,
      contactPhone: c.contact_phone || null,
      latitude: c.latitude,
      longitude: c.longitude,
      createdAt: toDate(c.created_at),
    })),
  });
  await fixSequence('Company');
  console.log(`Imported ${companies.length} companies`);

  // ---- User ----
  const users = loadTable(DUMP_DIR, 'inplace_db_users.sql', [
    'id', 'full_name', 'email', 'password', 'role', 'student_id', 'phone', 'avatar_initials', 'created_at',
    'company_id', 'is_active', 'academic_year', 'programme_type', 'approval_status', 'approved_by', 'approved_at',
    'rejection_reason', 'personal_email', 'home_address', 'emergency_contact_name', 'emergency_contact_phone',
    'student_id_number', 'bio',
  ]);
  const companyIds = new Set(companies.map((c) => c.id));
  await prisma.user.createMany({
    data: users.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      password: u.password,
      role: ROLE_MAP[u.role] || 'STUDENT',
      avatarInitials: u.avatar_initials || null,
      createdAt: toDate(u.created_at),
      updatedAt: toDate(u.created_at),
      companyId: companyIds.has(u.company_id) ? u.company_id : null,
      isActive: toBool(u.is_active),
      academicYear: u.academic_year || null,
      programmeType: u.programme_type || null,
      approvalStatus: APPROVAL_MAP[u.approval_status] || 'PENDING',
      rejectionReason: u.rejection_reason || null,
    })),
  });
  await fixSequence('User');
  const emailToUserId = new Map(users.map((u) => [u.email.toLowerCase(), u.id]));
  const userIds = new Set(users.map((u) => u.id));
  console.log(`Imported ${users.length} users`);

  // ---- Placement ----
  const placements = loadTable(DUMP_DIR, 'inplace_db_placements.sql', [
    'id', 'student_id', 'company_id', 'tutor_id', 'role_title', 'job_description', 'start_date', 'end_date',
    'salary', 'working_pattern', 'supervisor_name', 'supervisor_email', 'supervisor_phone', 'status',
    'tutor_comments', 'created_at', 'updated_at', 'latitude', 'longitude', 'provider_approved_at',
    'provider_approved_by', 'provider_feedback', 'provider_feedback_at', 'risk_flag', 'risk_level', 'risk_notes',
    'risk_flagged_at', 'risk_flagged_by', 'provider_rejection_reason', 'provider_rejected_at',
  ]);
  const validPlacements = placements.filter((p) => userIds.has(p.student_id) && companyIds.has(p.company_id));
  await prisma.placement.createMany({
    data: validPlacements.map((p) => ({
      id: p.id,
      studentId: p.student_id,
      companyId: p.company_id,
      tutorId: userIds.has(p.tutor_id) ? p.tutor_id : null,
      roleTitle: p.role_title || '',
      jobDescription: p.job_description || null,
      startDate: toDate(p.start_date),
      endDate: toDate(p.end_date),
      salary: p.salary || null,
      workingPattern: p.working_pattern || null,
      supervisorName: p.supervisor_name || null,
      supervisorEmail: p.supervisor_email || null,
      supervisorPhone: p.supervisor_phone || null,
      status: PLACEMENT_STATUS_MAP[p.status] || 'DRAFT',
      tutorComments: p.tutor_comments || null,
      riskFlag: toBool(p.risk_flag),
      riskLevel: p.risk_level || null,
      riskNotes: p.risk_notes || null,
      riskFlaggedAt: toDate(p.risk_flagged_at),
      riskFlaggedById: userIds.has(p.risk_flagged_by) ? p.risk_flagged_by : null,
      createdAt: toDate(p.created_at),
      updatedAt: toDate(p.updated_at) || toDate(p.created_at),
    })),
  });
  await fixSequence('Placement');
  const placementIds = new Set(validPlacements.map((p) => p.id));
  const placementCompany = new Map(validPlacements.map((p) => [p.id, p.company_id]));
  console.log(`Imported ${validPlacements.length} placements`);

  // ---- Document ----
  const documents = loadTable(DUMP_DIR, 'inplace_db_documents.sql', [
    'id', 'placement_id', 'uploaded_by', 'doc_type', 'file_name', 'file_path', 'file_size', 'status',
    'reviewer_feedback', 'reviewed_at', 'reviewed_by', 'uploaded_at',
  ]);
  const validDocs = documents.filter((d) => placementIds.has(d.placement_id) && userIds.has(d.uploaded_by));
  await prisma.document.createMany({
    data: validDocs.map((d) => ({
      id: d.id,
      placementId: d.placement_id,
      uploadedById: d.uploaded_by,
      fileName: d.file_name || 'document',
      filePath: d.file_path || '',
      category: d.doc_type || null,
      fileSize: parseFileSize(d.file_size),
      status: d.status || 'pending',
      reviewerFeedback: d.reviewer_feedback || null,
      reviewedAt: toDate(d.reviewed_at),
      reviewedById: userIds.has(d.reviewed_by) ? d.reviewed_by : null,
      createdAt: toDate(d.uploaded_at),
    })),
  });
  await fixSequence('Document');
  console.log(`Imported ${validDocs.length} documents`);

  // ---- Reflection ----
  const reflections = loadTable(DUMP_DIR, 'inplace_db_reflections.sql', [
    'id', 'student_id', 'placement_id', 'week_label', 'content', 'created_at',
  ]);
  const validReflections = reflections.filter((r) => placementIds.has(r.placement_id) && userIds.has(r.student_id));
  await prisma.reflection.createMany({
    data: validReflections.map((r) => {
      const weekNum = r.week_label ? parseInt(String(r.week_label).match(/\d+/)?.[0], 10) : null;
      return {
        id: r.id,
        placementId: r.placement_id,
        studentId: r.student_id,
        title: r.week_label || 'Reflection',
        content: r.content || '',
        weekNumber: Number.isFinite(weekNum) ? weekNum : null,
        createdAt: toDate(r.created_at),
        updatedAt: toDate(r.created_at),
      };
    }),
  });
  await fixSequence('Reflection');
  console.log(`Imported ${validReflections.length} reflections`);

  // ---- Visit ----
  const visits = loadTable(DUMP_DIR, 'inplace_db_visits.sql', [
    'id', 'placement_id', 'tutor_id', 'visit_date', 'visit_time', 'type', 'location', 'meeting_link', 'status',
    'notes', 'created_at', 'updated_at', 'duration_hours',
  ]);
  const validVisits = visits.filter((v) => placementIds.has(v.placement_id) && userIds.has(v.tutor_id) && v.visit_date);
  await prisma.visit.createMany({
    data: validVisits.map((v) => ({
      id: v.id,
      placementId: v.placement_id,
      tutorId: v.tutor_id,
      scheduledAt: new Date(`${v.visit_date}T${v.visit_time || '09:00:00'}`),
      durationHours: v.duration_hours || 2,
      visitType: v.type || 'physical',
      location: v.location || null,
      meetingLink: v.meeting_link || null,
      status: v.status || 'scheduled',
      notes: v.notes || null,
      createdAt: toDate(v.created_at),
      updatedAt: toDate(v.updated_at) || toDate(v.created_at),
    })),
  });
  await fixSequence('Visit');
  console.log(`Imported ${validVisits.length} visits`);

  // ---- PlacementChangeRequest ----
  const crs = loadTable(DUMP_DIR, 'inplace_db_placement_change_requests.sql', [
    'id', 'placement_id', 'student_id', 'change_type', 'justification', 'proposed_details', 'status',
    'provider_comment', 'tutor_comment', 'created_at', 'updated_at',
  ]);
  const validCrs = crs.filter((c) => placementIds.has(c.placement_id) && userIds.has(c.student_id));
  await prisma.placementChangeRequest.createMany({
    data: validCrs.map((c) => ({
      id: c.id,
      placementId: c.placement_id,
      requestedById: c.student_id,
      requestType: c.change_type,
      justification: c.justification || '',
      proposedDetails: c.proposed_details || null,
      status: CR_STATUS_MAP[c.status] || 'PENDING_PROVIDER',
      providerComment: c.provider_comment || null,
      tutorComment: c.tutor_comment || null,
      createdAt: toDate(c.created_at),
      updatedAt: toDate(c.updated_at) || toDate(c.created_at),
    })),
  });
  await fixSequence('PlacementChangeRequest');
  console.log(`Imported ${validCrs.length} placement change requests`);

  // ---- ProviderToken ----
  const tokens = loadTable(DUMP_DIR, 'inplace_db_provider_tokens.sql', [
    'id', 'token', 'placement_id', 'email', 'expires_at', 'used_at', 'created_at',
  ]);
  const validTokens = tokens.filter((t) => placementIds.has(t.placement_id));
  await prisma.providerToken.createMany({
    data: validTokens.map((t) => ({
      id: t.id,
      token: t.token,
      placementId: t.placement_id,
      expiresAt: toDate(t.expires_at) || new Date(),
      usedAt: toDate(t.used_at),
      createdAt: toDate(t.created_at),
    })),
  });
  await fixSequence('ProviderToken');
  console.log(`Imported ${validTokens.length} provider tokens`);

  // ---- ProviderMeeting ----
  const meetings = loadTable(DUMP_DIR, 'inplace_db_provider_meetings.sql', [
    'id', 'tutor_id', 'company_id', 'contact_name', 'contact_email', 'meeting_date', 'meeting_time',
    'duration_hours', 'type', 'location', 'meeting_link', 'agenda', 'status', 'created_at',
  ]);
  const validMeetings = meetings.filter((m) => userIds.has(m.tutor_id) && companyIds.has(m.company_id));
  await prisma.providerMeeting.createMany({
    data: validMeetings.map((m) => ({
      id: m.id,
      companyId: m.company_id,
      requestedById: m.tutor_id,
      contactName: m.contact_name || null,
      contactEmail: m.contact_email || null,
      scheduledAt: new Date(`${m.meeting_date}T${m.meeting_time || '09:00:00'}`),
      durationHours: m.duration_hours || 1,
      meetingType: m.type || 'physical',
      location: m.location || null,
      meetingLink: m.meeting_link || null,
      agenda: m.agenda || null,
      status: m.status || 'scheduled',
      createdAt: toDate(m.created_at),
    })),
  });
  await fixSequence('ProviderMeeting');
  console.log(`Imported ${validMeetings.length} provider meetings`);

  // ---- ProviderEvaluation ----
  const evals = loadTable(DUMP_DIR, 'inplace_db_provider_evaluations.sql', [
    'id', 'placement_id', 'provider_user_id', 'eval_period', 'attendance', 'punctuality', 'professionalism',
    'technical_skills', 'communication', 'initiative', 'overall_rating', 'strengths', 'areas_for_improvement',
    'additional_comments', 'recommend_future', 'created_at', 'updated_at',
  ]);
  const validEvals = evals.filter((e) => placementIds.has(e.placement_id) && userIds.has(e.provider_user_id));
  await prisma.providerEvaluation.createMany({
    data: validEvals.map((e) => {
      const subratings = [e.attendance, e.punctuality, e.professionalism, e.technical_skills, e.communication, e.initiative].filter((v) => v != null);
      const rating = e.overall_rating ?? (subratings.length ? Math.round(subratings.reduce((a, b) => a + b, 0) / subratings.length) : 3);
      const commentParts = [];
      if (e.strengths) commentParts.push(`Strengths: ${e.strengths}`);
      if (e.areas_for_improvement) commentParts.push(`Areas for improvement: ${e.areas_for_improvement}`);
      if (e.additional_comments) commentParts.push(e.additional_comments);
      return {
        id: e.id,
        placementId: e.placement_id,
        companyId: placementCompany.get(e.placement_id),
        evaluatedById: e.provider_user_id,
        rating,
        comments: commentParts.join('\n\n') || null,
        createdAt: toDate(e.created_at),
      };
    }),
  });
  await fixSequence('ProviderEvaluation');
  console.log(`Imported ${validEvals.length} provider evaluations`);

  // ---- ProviderIssue ----
  const issues = loadTable(DUMP_DIR, 'inplace_db_provider_issues.sql', [
    'id', 'placement_id', 'provider_user_id', 'issue_type', 'severity', 'description', 'desired_outcome',
    'status', 'tutor_response', 'resolved_at', 'created_at', 'updated_at',
  ]);
  const validIssues = issues.filter((i) => placementIds.has(i.placement_id) && userIds.has(i.provider_user_id));
  await prisma.providerIssue.createMany({
    data: validIssues.map((i) => ({
      id: i.id,
      placementId: i.placement_id,
      companyId: placementCompany.get(i.placement_id),
      raisedById: i.provider_user_id,
      title: i.issue_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      description: [i.description, i.desired_outcome ? `Desired outcome: ${i.desired_outcome}` : null].filter(Boolean).join('\n\n'),
      severity: i.severity || 'medium',
      status: i.status || 'open',
      resolutionNotes: i.tutor_response || null,
      createdAt: toDate(i.created_at),
      updatedAt: toDate(i.updated_at) || toDate(i.created_at),
    })),
  });
  await fixSequence('ProviderIssue');
  console.log(`Imported ${validIssues.length} provider issues`);

  // ---- PlacementOpportunity ----
  const opportunities = loadTable(DUMP_DIR, 'inplace_db_placement_opportunities.sql', [
    'id', 'company_id', 'posted_by', 'title', 'description', 'requirements', 'salary_range', 'start_date_est',
    'duration_months', 'positions', 'skills_required', 'is_active', 'deadline', 'created_at', 'updated_at',
  ]);
  const validOpps = opportunities.filter((o) => companyIds.has(o.company_id));
  await prisma.placementOpportunity.createMany({
    data: validOpps.map((o) => ({
      id: o.id,
      companyId: o.company_id,
      title: o.title,
      description: [o.description, o.requirements ? `Requirements: ${o.requirements}` : null, o.skills_required ? `Skills: ${o.skills_required}` : null, o.salary_range ? `Salary: ${o.salary_range}` : null].filter(Boolean).join('\n\n') || null,
      positions: o.positions || 1,
      isActive: toBool(o.is_active),
      createdAt: toDate(o.created_at),
    })),
  });
  await fixSequence('PlacementOpportunity');
  console.log(`Imported ${validOpps.length} placement opportunities`);

  // ---- Announcement ----
  const anns = loadTable(DUMP_DIR, 'inplace_db_announcements.sql', [
    'id', 'author_id', 'title', 'body', 'audience', 'target_value', 'is_pinned', 'expires_at', 'created_at', 'updated_at',
  ]);
  const validAnns = anns.filter((a) => userIds.has(a.author_id));
  await prisma.announcement.createMany({
    data: validAnns.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.body,
      audienceType: a.audience || 'all',
      targetValue: a.target_value || null,
      isPinned: toBool(a.is_pinned),
      expiresAt: toDate(a.expires_at),
      postedById: a.author_id,
      createdAt: toDate(a.created_at),
    })),
  });
  await fixSequence('Announcement');
  const announcementIds = new Set(validAnns.map((a) => a.id));
  console.log(`Imported ${validAnns.length} announcements`);

  // ---- AnnouncementRead ----
  const reads = loadTable(DUMP_DIR, 'inplace_db_announcement_reads.sql', ['id', 'announcement_id', 'student_id', 'read_at']);
  const validReads = reads.filter((r) => announcementIds.has(r.announcement_id) && userIds.has(r.student_id));
  await prisma.announcementRead.createMany({
    data: validReads.map((r) => ({
      id: r.id,
      announcementId: r.announcement_id,
      userId: r.student_id,
      readAt: toDate(r.read_at),
    })),
    skipDuplicates: true,
  });
  await fixSequence('AnnouncementRead');
  console.log(`Imported ${validReads.length} announcement reads`);

  // ---- Message ----
  const messages = loadTable(DUMP_DIR, 'inplace_db_messages.sql', [
    'id', 'sender_id', 'receiver_id', 'placement_id', 'message', 'is_read', 'created_at',
  ]);
  const validMessages = messages.filter((m) => userIds.has(m.sender_id) && userIds.has(m.receiver_id));
  await prisma.message.createMany({
    data: validMessages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      body: m.message,
      isRead: toBool(m.is_read),
      createdAt: toDate(m.created_at),
    })),
  });
  await fixSequence('Message');
  console.log(`Imported ${validMessages.length} messages`);

  // ---- Notification ----
  const notifs = loadTable(DUMP_DIR, 'inplace_db_notifications.sql', ['id', 'user_id', 'type', 'message', 'is_read', 'created_at']);
  const validNotifs = notifs.filter((n) => userIds.has(n.user_id));
  await prisma.notification.createMany({
    data: validNotifs.map((n) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type || 'general',
      title: (n.type || 'Notification').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      body: n.message || null,
      isRead: toBool(n.is_read),
      createdAt: toDate(n.created_at),
    })),
  });
  await fixSequence('Notification');
  console.log(`Imported ${validNotifs.length} notifications`);

  // ---- OtpCode ----
  const otps = loadTable(DUMP_DIR, 'inplace_db_otp_codes.sql', ['id', 'email', 'otp_code', 'expires_at', 'created_at']);
  const validOtps = otps.filter((o) => emailToUserId.has(o.email.toLowerCase()));
  await prisma.otpCode.createMany({
    data: validOtps.map((o) => ({
      id: o.id,
      userId: emailToUserId.get(o.email.toLowerCase()),
      code: o.otp_code,
      expiresAt: toDate(o.expires_at) || new Date(),
      createdAt: toDate(o.created_at),
    })),
  });
  await fixSequence('OtpCode');
  console.log(`Imported ${validOtps.length} otp codes`);

  // ---- PasswordReset ----
  const resets = loadTable(DUMP_DIR, 'inplace_db_password_resets.sql', ['id', 'email', 'token', 'expires_at', 'used', 'created_at']);
  const validResets = resets.filter((r) => emailToUserId.has(r.email.toLowerCase()));
  await prisma.passwordReset.createMany({
    data: validResets.map((r) => ({
      id: r.id,
      userId: emailToUserId.get(r.email.toLowerCase()),
      token: r.token,
      expiresAt: toDate(r.expires_at) || new Date(),
      usedAt: toBool(r.used) ? toDate(r.created_at) : null,
      createdAt: toDate(r.created_at),
    })),
    skipDuplicates: true,
  });
  await fixSequence('PasswordReset');
  console.log(`Imported ${validResets.length} password resets`);

  // ---- AuditLog ----
  const logs = loadTable(DUMP_DIR, 'inplace_db_audit_log.sql', [
    'id', 'user_id', 'action', 'table_affected', 'record_id', 'details', 'ip_address', 'created_at',
  ]);
  await prisma.auditLog.createMany({
    data: logs.map((l) => ({
      id: l.id,
      userId: userIds.has(l.user_id) ? l.user_id : null,
      action: l.action || 'unknown',
      tableAffected: l.table_affected || null,
      recordId: l.record_id || null,
      details: l.details || null,
      createdAt: toDate(l.created_at),
    })),
  });
  await fixSequence('AuditLog');
  console.log(`Imported ${logs.length} audit log entries`);

  // ---- SystemSetting (system_settings + tutor_settings merged) ----
  const sysSettings = loadTable(DUMP_DIR, 'inplace_db_system_settings.sql', ['id', 'setting_key', 'setting_value', 'updated_at']);
  const tutorSettings = loadTable(DUMP_DIR, 'inplace_db_tutor_settings.sql', ['setting_key', 'setting_value', 'updated_by', 'updated_at']);
  const allSettings = new Map();
  for (const s of sysSettings) allSettings.set(s.setting_key, s.setting_value ?? '');
  for (const s of tutorSettings) allSettings.set(s.setting_key, s.setting_value ?? '');
  await prisma.systemSetting.createMany({
    data: Array.from(allSettings.entries()).map(([key, value]) => ({ key, value })),
  });
  console.log(`Imported ${allSettings.size} system settings (incl. tutor cycle settings)`);

  console.log('\nImport complete.');
}

main()
  .catch((err) => { console.error('IMPORT FAILED:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
