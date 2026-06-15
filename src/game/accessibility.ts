// Accessibility helpers: announcement formatting and aria helpers
export function announcementText(msg: string): string {
  // Normalise whitespace and ensure short message
  return msg.replace(/\s+/g, ' ').trim();
}

export function liveRegionPoliteness(): 'polite' | 'assertive' { return 'assertive'; }
