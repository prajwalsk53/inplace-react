function toIcsDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildVisitIcs(visit, organizer, attendees) {
  const start = toIcsDate(visit.scheduledAt);
  const end = toIcsDate(new Date(new Date(visit.scheduledAt).getTime() + (visit.durationHours || 2) * 60 * 60 * 1000));
  const summary = `${visit.placement?.roleTitle || 'Placement Visit'} - Placement Visit`;

  let location = visit.placement?.company?.name || '';
  if (visit.visitType === 'virtual' && visit.meetingLink) {
    location = 'Virtual Meeting';
  } else if (visit.location) {
    location += `, ${visit.location}`;
  }

  let description = 'Placement Visit\\n\\n';
  description += `Student: ${visit.placement?.student?.fullName || ''}\\n`;
  description += `Tutor: ${organizer?.name || ''}\\n`;
  description += `Company: ${visit.placement?.company?.name || ''}\\n`;
  description += `Role: ${visit.placement?.roleTitle || ''}\\n\\n`;
  if (visit.visitType === 'virtual' && visit.meetingLink) description += `Join Meeting: ${visit.meetingLink}\\n\\n`;
  if (visit.notes) description += `Agenda:\\n${visit.notes.replace(/\n/g, '\\n')}\\n`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InPlace//Placement Management System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:visit-${visit.id}@inplace`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
  ];

  if (organizer) lines.push(`ORGANIZER;CN="${organizer.name}":mailto:${organizer.email}`);
  (attendees || []).forEach((att) => {
    lines.push(`ATTENDEE;CN="${att.name}";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${att.email}`);
  });

  lines.push('STATUS:CONFIRMED', 'SEQUENCE:0', 'PRIORITY:5');
  lines.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder: Placement visit tomorrow', 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

module.exports = { buildVisitIcs };
