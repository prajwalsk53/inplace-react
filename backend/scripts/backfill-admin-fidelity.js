// Backfills User.studentId / approvedById / approvedAt from the dump, which
// import-dump.js couldn't populate because the User model didn't have these
// columns yet.

const { PrismaClient } = require('@prisma/client');
const { loadTable } = require('./parse-dump');

const DUMP_DIR = 'C:/Users/DELL/OneDrive/Documents/dumps/Dump20260706';
const prisma = new PrismaClient();
const toDate = (v) => (v ? new Date(v) : null);

async function main() {
  console.log('Target DB:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  const users = loadTable(DUMP_DIR, 'inplace_db_users.sql', [
    'id', 'full_name', 'email', 'password', 'role', 'student_id', 'phone', 'avatar_initials', 'created_at',
    'company_id', 'is_active', 'academic_year', 'programme_type', 'approval_status', 'approved_by', 'approved_at',
    'rejection_reason', 'personal_email', 'home_address', 'emergency_contact_name', 'emergency_contact_phone',
    'student_id_number', 'bio',
  ]);
  const existingIds = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));

  let count = 0;
  for (const u of users) {
    if (!existingIds.has(u.id)) continue;
    await prisma.user.update({
      where: { id: u.id },
      data: {
        studentId: u.student_id || null,
        approvedById: existingIds.has(u.approved_by) ? u.approved_by : null,
        approvedAt: toDate(u.approved_at),
      },
    });
    count++;
  }
  console.log(`Backfilled ${count} users with studentId/approvedById/approvedAt`);
}

main().catch((err) => { console.error('BACKFILL FAILED:', err); process.exit(1); }).finally(() => prisma.$disconnect());
