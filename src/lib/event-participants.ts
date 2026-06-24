export interface EventParticipantSource {
  id: string;
  currentParticipants?: {
    male?: number;
    female?: number;
    couple?: number;
  };
  customParticipantCounts?: Record<string, number>;
}

/** Derive confirmed participant totals from event docs (no extra Firestore reads). */
export function deriveParticipantCountsFromEvents(
  events: EventParticipantSource[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const event of events) {
    const participants = event.currentParticipants || {};
    const customSum = Object.values(event.customParticipantCounts || {}).reduce(
      (sum, value) => sum + (typeof value === 'number' ? value : 0),
      0
    );

    counts[event.id] =
      (participants.male || 0) +
      (participants.female || 0) +
      (participants.couple || 0) +
      customSum;
  }

  return counts;
}
