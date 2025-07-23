import {
  addDays,
  format,
  getDay,
  parse,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isBefore,
  startOfDay,
} from 'date-fns';

/**
 * Checks if a given date is a business day (Monday to Friday).
 * @param date - The date to check.
 * @returns True if the date is a weekday, false otherwise.
 */
export function isBusinessDay(date: Date): boolean {
  const day = getDay(date); // 0 = Sunday, 6 = Saturday
  return day >= 1 && day <= 5;
}

/**
 * Calculates the date that is a specified number of business days ahead of a start date.
 * @param startDate - The date to start counting from.
 * @param businessDaysToAdd - The number of business days to add.
 * @returns The date that is 'businessDaysToAdd' business days after 'startDate'.
 */
export function getBusinessDaysAhead(startDate: Date, businessDaysToAdd: number): Date {
  let currentDate = startOfDay(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDaysToAdd) {
    currentDate = addDays(currentDate, 1);
    if (isBusinessDay(currentDate)) {
      daysAdded++;
    }
  }
  return currentDate;
}

/**
 * Calculates the earliest available date for pickup (2 business days from today).
 * @returns The earliest pickup date.
 */
export function getEarliestPickupDate(): Date {
  // Need 2 full business days notice. If today is Mon, earliest is Wed. If Fri, earliest is Tue.
  return getBusinessDaysAhead(new Date(), 2);
}

/**
 * Calculates the earliest available date for local delivery (2 business days from today).
 * Assumes 48 hours notice as discussed.
 * @returns The earliest local delivery date.
 */
export function getEarliestDeliveryDate(): Date {
  // Need 2 full business days notice.
  return getBusinessDaysAhead(new Date(), 2);
}

/**
 * Generates available pickup time slots (10:00 AM - 4:00 PM, hourly).
 * @returns An array of time strings in HH:mm format.
 */
export function getPickupTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 10; hour <= 16; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

/**
 * Generates available local delivery time slots (10:00 AM - 2:00 PM, hourly).
 * @returns An array of time strings in HH:mm format.
 */
export function getDeliveryTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 10; hour <= 14; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  return slots;
}

/**
 * Parses a date string (YYYY-MM-DD) and time string (HH:mm) into a Date object.
 * @param dateStr - Date string in YYYY-MM-DD format.
 * @param timeStr - Time string in HH:mm format.
 * @returns A Date object representing the combined date and time, or null if parsing fails.
 */
function parseDateTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr || !timeStr) return null;
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    // Month is 0-indexed in JS Date
    return new Date(year, month - 1, day, hour, minute);
  } catch (e) {
    console.error('Error parsing date/time:', e);
    return null;
  }
}

/**
 * Validates if the selected date and time are valid for pickup.
 * Checks for: 2 business days notice, business day selection, and within 10 AM - 4 PM.
 * @param dateStr - Selected date string (YYYY-MM-DD).
 * @param timeStr - Selected time string (HH:mm).
 * @returns True if valid, false otherwise.
 */
export function isValidPickupDateTime(dateStr: string, timeStr: string): boolean {
  const selectedDateTime = parseDateTime(dateStr, timeStr);
  if (!selectedDateTime) return false;

  const earliestPickupDate = getEarliestPickupDate();

  // 1. Check if date is on or after the earliest possible date
  if (isBefore(startOfDay(selectedDateTime), startOfDay(earliestPickupDate))) {
    return false;
  }

  // 2. Check if selected date is a business day
  if (!isBusinessDay(selectedDateTime)) {
    return false;
  }

  // 3. Check if time is within the allowed range (10:00 to 16:00)
  const hour = selectedDateTime.getHours();
  if (hour < 10 || hour > 16) {
    return false;
  }

  // 4. Check if time slot is one of the generated ones (redundant if using select, but good validation)
  if (!getPickupTimeSlots().includes(timeStr)) {
    return false;
  }

  return true;
}

/**
 * Validates if the selected date and time are valid for local delivery.
 * Checks for: 2 business days notice, business day selection, and within 10 AM - 2 PM.
 * @param dateStr - Selected date string (YYYY-MM-DD).
 * @param timeStr - Selected time string (HH:mm).
 * @returns True if valid, false otherwise.
 */
export function isValidDeliveryDateTime(dateStr: string, timeStr: string): boolean {
  const selectedDateTime = parseDateTime(dateStr, timeStr);
  if (!selectedDateTime) return false;

  const earliestDeliveryDate = getEarliestDeliveryDate();

  // 1. Check if date is on or after the earliest possible date
  if (isBefore(startOfDay(selectedDateTime), startOfDay(earliestDeliveryDate))) {
    return false;
  }

  // 2. Check if selected date is a business day
  if (!isBusinessDay(selectedDateTime)) {
    return false;
  }

  // 3. Check if time is within the allowed range (10:00 to 14:00)
  const hour = selectedDateTime.getHours();
  if (hour < 10 || hour > 14) {
    return false;
  }

  // 4. Check if time slot is one of the generated ones
  if (!getDeliveryTimeSlots().includes(timeStr)) {
    return false;
  }

  return true;
}
