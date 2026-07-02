function toIcsDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildVisitIcs(visit) {
  const start = toIcsDate(visit.scheduledAt);
  const end = toIcsDate(new Date(new Date(visit.scheduledAt).getTime() + 60 * 60 * 1000));
  const summary = `Placement Visit (${visit.visitType.replace('_', ' ')})`;
  const description = (visit.notes || '').replace(/\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InPlace//Placement Visits//EN',
    'BEGIN:VEVENT',
    `UID:visit-${visit.id}@inplace`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

module.exports = { buildVisitIcs };
