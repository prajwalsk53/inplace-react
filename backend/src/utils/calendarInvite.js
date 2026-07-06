function toIcsDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildIcs({ uid, start, end, summary, description, location, organizer, attendees, reminderText }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//InPlace//Placement Management System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
  ];

  if (organizer) lines.push(`ORGANIZER;CN="${organizer.name}":mailto:${organizer.email}`);
  (attendees || []).forEach((att) => {
    lines.push(`ATTENDEE;CN="${att.name}";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${att.email}`);
  });

  lines.push('STATUS:CONFIRMED', 'SEQUENCE:0', 'PRIORITY:5');
  lines.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${reminderText}`, 'END:VALARM');
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\r\n');
}

function buildVisitIcs(visit, organizer, attendees) {
  const start = new Date(visit.scheduledAt);
  const end = new Date(start.getTime() + (visit.durationHours || 2) * 60 * 60 * 1000);
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

  return buildIcs({
    uid: `visit-${visit.id}@inplace`, start, end, summary, description, location, organizer, attendees,
    reminderText: 'Reminder: Placement visit tomorrow',
  });
}

function buildMeetingIcs(meeting, organizer, attendee) {
  const start = new Date(meeting.scheduledAt);
  const end = new Date(start.getTime() + (meeting.durationHours || 1) * 60 * 60 * 1000);
  const summary = `Provider Meeting - ${meeting.company?.name || ''}`;
  const location = meeting.meetingType === 'virtual' ? 'Virtual Meeting' : (meeting.location || meeting.company?.name || '');

  let description = 'Provider Meeting\\n\\n';
  description += `Tutor: ${organizer?.name || ''}\\n`;
  description += `Company: ${meeting.company?.name || ''}\\n`;
  if (meeting.contactName) description += `Contact: ${meeting.contactName}\\n`;
  if (meeting.meetingType === 'virtual' && meeting.meetingLink) description += `Join: ${meeting.meetingLink}\\n`;
  if (meeting.agenda) description += `\\nAgenda:\\n${meeting.agenda.replace(/\n/g, '\\n')}`;

  return buildIcs({
    uid: `provider-meeting-${meeting.id}@inplace`, start, end, summary, description, location, organizer,
    attendees: attendee ? [attendee] : [],
    reminderText: 'Reminder: Provider meeting tomorrow',
  });
}

module.exports = { buildVisitIcs, buildMeetingIcs };
