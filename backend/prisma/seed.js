require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding demo data...');
  const hash = await bcrypt.hash('password', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@inplace.com' },
    update: { password: hash },
    create: { fullName: 'Admin User', email: 'admin@inplace.com', password: hash, role: 'ADMIN', approvalStatus: 'APPROVED', avatarInitials: 'AU' },
  });

  const director = await prisma.user.upsert({
    where: { email: 'director@inplace.com' },
    update: { password: hash },
    create: { fullName: 'Dr Alice Morgan', email: 'director@inplace.com', password: hash, role: 'DIRECTOR', approvalStatus: 'APPROVED', avatarInitials: 'AM' },
  });

  const tutor = await prisma.user.upsert({
    where: { email: 'tutor@inplace.com' },
    update: { password: hash },
    create: { fullName: 'James Whitfield', email: 'tutor@inplace.com', password: hash, role: 'TUTOR', approvalStatus: 'APPROVED', avatarInitials: 'JW' },
  });

  const companyFields = {
    name: 'Acme Digital Ltd',
    address: '12 Innovation Way, Leicester, LE1 6TP',
    city: 'Leicester',
    sector: 'Technology',
    contactName: 'Sarah Collins',
    contactEmail: 'sarah.collins@acmedigital.example',
    contactPhone: '0116 555 0134',
    latitude: 52.6369,
    longitude: -1.1398,
  };
  const company = await prisma.company.upsert({
    where: { id: 1 },
    update: companyFields,
    create: companyFields,
  });

  const provider = await prisma.user.upsert({
    where: { email: 'provider@inplace.com' },
    update: { password: hash },
    create: {
      fullName: 'Sarah Collins',
      email: 'provider@inplace.com',
      password: hash,
      role: 'PROVIDER',
      approvalStatus: 'APPROVED',
      avatarInitials: 'SC',
      companyId: company.id,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@inplace.com' },
    update: { password: hash },
    create: {
      fullName: 'Priya Nair',
      email: 'student@inplace.com',
      password: hash,
      role: 'STUDENT',
      approvalStatus: 'APPROVED',
      avatarInitials: 'PN',
      academicYear: 'Year 3',
      programmeType: 'BSc Computer Science',
    },
  });

  const pendingStudent = await prisma.user.upsert({
    where: { email: 'pending.student@inplace.com' },
    update: { password: hash },
    create: {
      fullName: 'Tom Baker',
      email: 'pending.student@inplace.com',
      password: hash,
      role: 'STUDENT',
      approvalStatus: 'PENDING',
      avatarInitials: 'TB',
      academicYear: 'Year 2',
      programmeType: 'BSc Software Engineering',
    },
  });

  const placementDates = {
    startDate: new Date(Date.now() - 90 * 86400000),
    endDate: new Date(Date.now() + 270 * 86400000),
  };
  const placement = await prisma.placement.upsert({
    where: { id: 1 },
    update: { ...placementDates },
    create: {
      studentId: student.id,
      companyId: company.id,
      tutorId: tutor.id,
      roleTitle: 'Software Engineering Intern',
      jobDescription: 'Working within the platform team on internal tooling.',
      ...placementDates,
      salary: 22000,
      workingPattern: 'Full-time, Mon-Fri',
      supervisorName: 'Sarah Collins',
      supervisorEmail: 'sarah.collins@acmedigital.example',
      supervisorPhone: '0116 555 0134',
      status: 'ACTIVE',
    },
  });

  if ((await prisma.visit.count({ where: { placementId: placement.id } })) === 0) {
    await prisma.visit.createMany({
      data: [
        { placementId: placement.id, tutorId: tutor.id, scheduledAt: new Date(Date.now() + 7 * 86400000), visitType: 'in_person', status: 'scheduled' },
        { placementId: placement.id, tutorId: tutor.id, scheduledAt: new Date(Date.now() - 30 * 86400000), visitType: 'virtual', status: 'completed', notes: 'Student settling in well, no concerns raised.', outcome: 'Satisfactory' },
      ],
    });
  }

  if ((await prisma.reflection.count({ where: { placementId: placement.id } })) === 0) {
    await prisma.reflection.createMany({
      data: [
        { placementId: placement.id, studentId: student.id, title: 'Week 1 Reflection', content: 'Onboarding went smoothly, met the team and set up dev environment.', weekNumber: 1, status: 'reviewed', tutorFeedback: 'Great start, keep documenting your learning.' },
      ],
    });
  }

  if ((await prisma.announcement.count()) === 0) {
    await prisma.announcement.createMany({
      data: [
        { title: 'Welcome to the new placement year', content: 'Please review the placement handbook before your first day.', postedById: admin.id },
      ],
    });
  }

  if ((await prisma.notification.count({ where: { userId: { in: [student.id, tutor.id] } } })) === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: student.id, type: 'placement', title: 'Placement Approved', body: 'Your placement with Acme Digital Ltd has been approved.' },
        { userId: tutor.id, type: 'visit', title: 'Upcoming Visit', body: 'You have a visit scheduled next week.' },
      ],
    });
  }

  console.log('Seed complete. Demo accounts (password: "password"):');
  console.log(' admin@inplace.com / tutor@inplace.com / provider@inplace.com / student@inplace.com / director@inplace.com');
  console.log(` pending.student@inplace.com (id ${pendingStudent.id}) is awaiting admin approval.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
