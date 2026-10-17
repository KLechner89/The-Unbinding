// The only meeting types a visitor may choose, and how each is labelled.
// Look-ups go through isMeetingType / meetingTypeLabel so that names inherited
// from JavaScript objects (such as "constructor", "__proto__" or "toString")
// are never accepted as a meeting type.

export const MEETING_TYPES = Object.freeze({ video: 'Video', phone: 'Phone', in_person: 'In person' });

export const isMeetingType = (type) => typeof type === 'string' && Object.hasOwn(MEETING_TYPES, type);

// Returns the label for a valid meeting type, or undefined for anything else.
export const meetingTypeLabel = (type) => (isMeetingType(type) ? MEETING_TYPES[type] : undefined);
