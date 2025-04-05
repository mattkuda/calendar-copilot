import { parseISO, addDays, format, startOfDay, endOfDay, addMinutes } from 'date-fns';

/**
 * Parse natural language or ISO date strings
 */
export const parseDate = (dateStr: string): Date => {
    // Handle natural language dates
    if (dateStr.toLowerCase() === 'today') {
        return new Date();
    } else if (dateStr.toLowerCase() === 'tomorrow') {
        return addDays(new Date(), 1);
    } else if (dateStr.toLowerCase() === 'next week') {
        return addDays(new Date(), 7);
    } else if (dateStr.toLowerCase().includes('next')) {
        // Handle "next monday", "next tuesday", etc.
        const dayMap: Record<string, number> = {
            sunday: 0,
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
        };

        const dayName = dateStr.toLowerCase().replace('next ', '');
        const targetDay = dayMap[dayName];

        if (targetDay !== undefined) {
            const today = new Date();
            const currentDay = today.getDay();
            const daysUntilTarget = (targetDay - currentDay + 7) % 7;
            return addDays(today, daysUntilTarget === 0 ? 7 : daysUntilTarget);
        }
    }

    // Try to parse as ISO date
    try {
        return parseISO(dateStr);
    } catch (error) {
        throw new Error(`Invalid date format: ${dateStr}`);
    }
};

/**
 * Format a date as ISO string with only the date portion
 */
export const formatDateISO = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
};

/**
 * Format a date in a human-readable format
 */
export const formatDateHuman = (date: Date): string => {
    return format(date, 'EEEE, MMMM do, yyyy');
};

/**
 * Format a time in a human-readable format
 */
export const formatTimeHuman = (date: Date): string => {
    return format(date, 'h:mm a');
};

/**
 * Calculate the end time based on start time and duration in minutes
 */
export const calculateEndTime = (startTime: Date, durationMinutes: number): Date => {
    return addMinutes(startTime, durationMinutes);
}; 