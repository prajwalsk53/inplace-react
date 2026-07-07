const prisma = require('../config/db');

const NON_DRAFT = { not: 'DRAFT' };
const ACTIVE_ISH = ['APPROVED', 'ACTIVE'];
const PENDING_ISH = ['SUBMITTED', 'AWAITING_PROVIDER', 'AWAITING_TUTOR'];

function isoWeekYear(dateStr) {
  return dateStr || 'Unknown';
}

// ── Dashboard ────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const [totalStudents, totalPlacements, activePlacements, pendingApproval, rejectedCount, totalVisits, completedVisits, atRiskAll, atRiskHigh, evalCount] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      prisma.placement.count({ where: { status: NON_DRAFT } }),
      prisma.placement.count({ where: { status: { in: ACTIVE_ISH } } }),
      prisma.placement.count({ where: { status: { in: PENDING_ISH } } }),
      prisma.placement.count({ where: { status: 'REJECTED' } }),
      prisma.visit.count(),
      prisma.visit.count({ where: { status: 'completed' } }),
      prisma.placement.count({ where: { riskFlag: true } }),
      prisma.placement.count({ where: { riskFlag: true, riskLevel: 'high' } }),
      prisma.providerEvaluation.count(),
    ]);
    const approvalRate = totalPlacements > 0 ? Math.round((activePlacements / totalPlacements) * 100) : 0;
    const visitCompletion = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0;

    const activeForCharts = await prisma.placement.findMany({
      where: { status: { in: ACTIVE_ISH } },
      include: { company: { select: { name: true, sector: true, city: true } } },
    });
    const bySectorMap = {};
    const byCityMap = {};
    const byCompanyMap = {};
    for (const p of activeForCharts) {
      const sector = p.company.sector || 'Unknown';
      const city = p.company.city?.trim() || 'Unknown';
      bySectorMap[sector] = (bySectorMap[sector] || 0) + 1;
      byCityMap[city] = (byCityMap[city] || 0) + 1;
      byCompanyMap[p.company.name] = (byCompanyMap[p.company.name] || 0) + 1;
    }
    const bySector = Object.entries(bySectorMap).map(([label, cnt]) => ({ label, cnt })).sort((a, b) => b.cnt - a.cnt).slice(0, 10);
    const byCity = Object.entries(byCityMap).map(([label, cnt]) => ({ label, cnt })).sort((a, b) => b.cnt - a.cnt).slice(0, 10);
    const topCompanies = Object.entries(byCompanyMap).map(([label, cnt]) => ({ label, cnt })).sort((a, b) => b.cnt - a.cnt).slice(0, 8);

    const statusGroups = await prisma.placement.groupBy({ by: ['status'], where: { status: NON_DRAFT }, _count: { _all: true } });
    const statusBreakdown = statusGroups.map((g) => ({ status: g.status, cnt: g._count._all }));

    const yoyPlacements = await prisma.placement.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE', 'REJECTED', 'TERMINATED'] } },
      include: { student: { select: { academicYear: true } } },
    });
    const yoyMap = {};
    for (const p of yoyPlacements) {
      const yr = p.student.academicYear || 'Unknown';
      yoyMap[yr] = (yoyMap[yr] || 0) + 1;
    }
    const yoy = Object.entries(yoyMap).map(([yr, cnt]) => ({ yr, cnt })).sort((a, b) => (a.yr < b.yr ? -1 : 1));

    const recent = await prisma.placement.findMany({
      where: { status: NON_DRAFT },
      include: { student: { select: { fullName: true } }, company: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    res.json({
      totalStudents, totalPlacements, activePlacements, pendingApproval, rejectedCount, approvalRate,
      totalVisits, completedVisits, visitCompletion, atRiskAll, atRiskHigh, evalCount,
      bySector, byCity, topCompanies, statusBreakdown, yoy,
      recent: recent.map((p) => ({ status: p.status, createdAt: p.createdAt, studentName: p.student.fullName, companyName: p.company.name, roleTitle: p.roleTitle })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── At-risk ──────────────────────────────────────────────────────────────
exports.getAtRiskPlacements = async (req, res) => {
  try {
    const flagged = await prisma.placement.findMany({
      where: { riskFlag: true },
      include: {
        student: { select: { fullName: true, email: true, academicYear: true, programmeType: true } },
        company: { select: { name: true, sector: true, city: true } },
        tutor: { select: { fullName: true, email: true } },
        riskFlaggedBy: { select: { fullName: true } },
      },
      orderBy: { riskFlaggedAt: 'desc' },
    });
    const riskOrder = { high: 0, medium: 1, low: 2 };
    flagged.sort((a, b) => (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3));

    const allActive = await prisma.placement.findMany({
      where: { status: { in: ACTIVE_ISH } },
      include: { student: { select: { fullName: true, academicYear: true, programmeType: true } }, company: { select: { name: true } } },
      orderBy: [{ riskFlag: 'desc' }],
    });
    allActive.sort((a, b) => {
      if (a.riskFlag !== b.riskFlag) return a.riskFlag ? -1 : 1;
      return (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3);
    });

    res.json({
      flagged: flagged.map((p) => ({
        placementId: p.id, riskLevel: p.riskLevel, riskNotes: p.riskNotes, riskFlaggedAt: p.riskFlaggedAt,
        startDate: p.startDate, endDate: p.endDate, roleTitle: p.roleTitle, status: p.status,
        studentName: p.student.fullName, studentEmail: p.student.email, academicYear: p.student.academicYear, programmeType: p.student.programmeType,
        companyName: p.company.name, sector: p.company.sector, city: p.company.city,
        tutorName: p.tutor?.fullName, tutorEmail: p.tutor?.email, flaggedByName: p.riskFlaggedBy?.fullName,
      })),
      allActive: allActive.map((p) => ({
        studentName: p.student.fullName, academicYear: p.student.academicYear, programmeType: p.student.programmeType,
        companyName: p.company.name, roleTitle: p.roleTitle, status: p.status, riskFlag: p.riskFlag, riskLevel: p.riskLevel,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Employer feedback ─────────────────────────────────────────────────────
const CRITERIA_KEYS = ['attendance', 'punctuality', 'professionalism', 'technicalSkills', 'communication', 'initiative', 'rating'];

exports.getFeedback = async (req, res) => {
  try {
    const evaluations = await prisma.providerEvaluation.findMany({
      include: {
        placement: { select: { roleTitle: true, student: { select: { fullName: true, academicYear: true, programmeType: true } } } },
        company: { select: { name: true, sector: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const periodOrder = { final: 0, interim: 1, ad_hoc: 2 };
    evaluations.sort((a, b) => (periodOrder[a.evalPeriod] ?? 3) - (periodOrder[b.evalPeriod] ?? 3));

    const avgAll = {};
    for (const key of CRITERIA_KEYS) {
      const vals = evaluations.map((e) => e[key]).filter((v) => v !== null && v !== undefined);
      avgAll[key] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    }

    const byCompanyMap = {};
    for (const e of evaluations) {
      const co = e.company.name;
      if (!byCompanyMap[co]) byCompanyMap[co] = { ratings: [], count: 0, recommend: 0, sector: e.company.sector };
      byCompanyMap[co].ratings.push(e.rating);
      byCompanyMap[co].count++;
      if (e.recommendFuture) byCompanyMap[co].recommend++;
    }
    const byCompany = Object.entries(byCompanyMap).map(([name, d]) => ({
      name, count: d.count, recommend: d.recommend, sector: d.sector,
      avg: d.ratings.length ? Math.round((d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length) * 10) / 10 : null,
    })).sort((a, b) => (b.avg || 0) - (a.avg || 0));

    const totalEvals = evaluations.length;
    const recommendCount = evaluations.filter((e) => e.recommendFuture).length;
    const recommendRate = totalEvals > 0 ? Math.round((recommendCount / totalEvals) * 100) : 0;
    const interimCount = evaluations.filter((e) => e.evalPeriod === 'interim').length;
    const finalCount = evaluations.filter((e) => e.evalPeriod === 'final').length;

    res.json({
      totalEvals, avgOverall: avgAll.rating, recommendRate, interimCount, finalCount, avgAll, byCompany,
      evaluations: evaluations.map((e) => ({
        studentName: e.placement.student.fullName, academicYear: e.placement.student.academicYear,
        companyName: e.company.name, evalPeriod: e.evalPeriod, rating: e.rating,
        attendance: e.attendance, professionalism: e.professionalism, technicalSkills: e.technicalSkills, communication: e.communication,
        recommendFuture: e.recommendFuture, createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Map ──────────────────────────────────────────────────────────────────
exports.getMapPlacements = async (req, res) => {
  try {
    const placements = await prisma.placement.findMany({
      where: { status: { in: ACTIVE_ISH } },
      include: {
        student: { select: { fullName: true, academicYear: true } },
        tutor: { select: { fullName: true } },
        company: true,
      },
      orderBy: { company: { name: 'asc' } },
    });
    const mapped = placements.map((p) => ({
      id: p.id, roleTitle: p.roleTitle, status: p.status, startDate: p.startDate, endDate: p.endDate,
      companyName: p.company.name, city: p.company.city, sector: p.company.sector, address: p.company.address,
      latitude: p.company.latitude, longitude: p.company.longitude,
      studentName: p.student.fullName, academicYear: p.student.academicYear, tutorName: p.tutor?.fullName,
    }));
    const sectorCounts = {};
    for (const p of mapped) {
      const s = p.sector || 'Unknown';
      sectorCounts[s] = (sectorCounts[s] || 0) + 1;
    }
    res.json({
      placements: mapped,
      withCoordsCount: mapped.filter((p) => p.latitude && p.longitude).length,
      sectorCounts: Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Placement statistics (filterable) ─────────────────────────────────────
exports.getPlacements = async (req, res) => {
  try {
    const { year, sector, status } = req.query;
    const placements = await prisma.placement.findMany({
      where: {
        status: status ? status.toUpperCase() : NON_DRAFT,
        student: year ? { academicYear: year } : undefined,
        company: sector ? { sector } : undefined,
      },
      include: {
        student: { select: { fullName: true, academicYear: true, programmeType: true } },
        company: { select: { name: true, city: true, sector: true } },
        tutor: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(placements.map((p) => ({
      id: p.id, status: p.status, startDate: p.startDate, endDate: p.endDate, roleTitle: p.roleTitle, createdAt: p.createdAt,
      studentName: p.student.fullName, academicYear: p.student.academicYear, programmeType: p.student.programmeType,
      companyName: p.company.name, city: p.company.city, sector: p.company.sector, tutorName: p.tutor?.fullName,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPlacementFilters = async (req, res) => {
  try {
    const [years, sectors] = await Promise.all([
      prisma.user.findMany({ where: { role: 'STUDENT', academicYear: { not: null } }, select: { academicYear: true }, distinct: ['academicYear'], orderBy: { academicYear: 'desc' } }),
      prisma.company.findMany({ where: { sector: { not: null } }, select: { sector: true }, distinct: ['sector'], orderBy: { sector: 'asc' } }),
    ]);
    res.json({ years: years.map((y) => y.academicYear), sectors: sectors.map((s) => s.sector) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Reports & CSV exports ─────────────────────────────────────────────────
exports.getReportsSummary = async (req, res) => {
  try {
    const [placementCount, visitCount, evalCount, atRiskCount] = await Promise.all([
      prisma.placement.count({ where: { status: NON_DRAFT } }),
      prisma.visit.count(),
      prisma.providerEvaluation.count(),
      prisma.placement.count({ where: { riskFlag: true } }),
    ]);
    res.json({ placementCount, visitCount, evalCount, atRiskCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const titleCase = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const toDateStr = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const csvOut = (res, filenamePrefix, header, rows) => {
  const filename = `inplace_${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=UTF-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n'));
};

exports.exportCsv = async (req, res) => {
  try {
    const { type } = req.params;

    if (type === 'placements') {
      const placements = await prisma.placement.findMany({
        where: { status: NON_DRAFT },
        include: { student: { select: { fullName: true, email: true, academicYear: true, programmeType: true } }, company: { select: { name: true, sector: true, city: true } }, tutor: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return csvOut(res, 'placements',
        ['Student Name', 'Student Email', 'Academic Year', 'Programme', 'Company', 'Sector', 'City', 'Role', 'Start Date', 'End Date', 'Salary', 'Status', 'Tutor', 'Submitted'],
        placements.map((p) => [p.student.fullName, p.student.email, p.student.academicYear, p.student.programmeType, p.company.name, p.company.sector, p.company.city, p.roleTitle, toDateStr(p.startDate), toDateStr(p.endDate), p.salary, titleCase(p.status.toLowerCase()), p.tutor?.fullName || 'Unassigned', toDateStr(p.createdAt)]));
    }

    if (type === 'visits') {
      const visits = await prisma.visit.findMany({
        include: { placement: { include: { student: { select: { fullName: true } }, company: { select: { name: true } } } }, tutor: { select: { fullName: true } } },
        orderBy: { scheduledAt: 'desc' },
      });
      return csvOut(res, 'visits',
        ['Visit Date', 'Visit Time', 'Student', 'Company', 'Tutor', 'Type', 'Status', 'Duration (hrs)'],
        visits.map((v) => [toDateStr(v.scheduledAt), new Date(v.scheduledAt).toISOString().slice(11, 16), v.placement.student.fullName, v.placement.company.name, v.tutor?.fullName, v.visitType, v.status, v.durationHours]));
    }

    if (type === 'at_risk') {
      const flagged = await prisma.placement.findMany({
        where: { riskFlag: true },
        include: { student: { select: { fullName: true, email: true } }, company: { select: { name: true } }, riskFlaggedBy: { select: { fullName: true } } },
      });
      const riskOrder = { high: 0, medium: 1, low: 2 };
      flagged.sort((a, b) => (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3));
      return csvOut(res, 'at_risk',
        ['Student', 'Email', 'Company', 'Role', 'Risk Level', 'Notes', 'Flagged At', 'Flagged By'],
        flagged.map((p) => [p.student.fullName, p.student.email, p.company.name, p.roleTitle, p.riskLevel, p.riskNotes, toDateStr(p.riskFlaggedAt), p.riskFlaggedBy?.fullName]));
    }

    if (type === 'evaluations') {
      const evaluations = await prisma.providerEvaluation.findMany({
        include: { placement: { include: { student: { select: { fullName: true } } } }, company: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return csvOut(res, 'evaluations',
        ['Student', 'Company', 'Period', 'Attendance', 'Punctuality', 'Professionalism', 'Technical Skills', 'Communication', 'Initiative', 'Overall', 'Recommend', 'Submitted'],
        evaluations.map((e) => [e.placement.student.fullName, e.company.name, e.evalPeriod, e.attendance, e.punctuality, e.professionalism, e.technicalSkills, e.communication, e.initiative, e.rating, e.recommendFuture ? 'Yes' : 'No', toDateStr(e.createdAt)]));
    }

    if (type === 'summary') {
      const placements = await prisma.placement.findMany({ where: { status: NON_DRAFT }, include: { company: { select: { sector: true } } } });
      const bySector = {};
      for (const p of placements) {
        const s = p.company.sector || 'Unknown';
        if (!bySector[s]) bySector[s] = { total: 0, active: 0, pending: 0, rejected: 0, durations: [] };
        bySector[s].total++;
        if (ACTIVE_ISH.includes(p.status)) bySector[s].active++;
        if (PENDING_ISH.includes(p.status)) bySector[s].pending++;
        if (p.status === 'REJECTED') bySector[s].rejected++;
        if (p.startDate && p.endDate) bySector[s].durations.push((new Date(p.endDate) - new Date(p.startDate)) / 86400000);
      }
      const rows = Object.entries(bySector).sort((a, b) => b[1].total - a[1].total).map(([sector, d]) => [
        sector, d.total, d.active, d.pending, d.rejected,
        d.durations.length ? Math.round(d.durations.reduce((a, b) => a + b, 0) / d.durations.length) : '',
      ]);
      return csvOut(res, 'summary', ['Sector', 'Total Placements', 'Active', 'Pending', 'Rejected', 'Avg Duration (days)'], rows);
    }

    res.status(400).json({ error: 'Unknown export type' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
