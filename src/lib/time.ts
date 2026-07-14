export function getPHTDate(): Date {
  // Create a Date object forced to PHT (Asia/Manila)
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
  // PHT is UTC+8
  return new Date(utc + (8 * 60 * 60 * 1000));
}

export function formatPHTDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return formatter.format(date);
}

export function formatPHTTime(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return formatter.format(date);
}

export function getPHTTimestamp(date: Date = new Date()): string {
  return `${formatPHTDate(date)}, ${formatPHTTime(date)}`;
}

export function getCurrentPHTHour(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    hour12: false
  });
  return parseInt(formatter.format(new Date()), 10);
}
