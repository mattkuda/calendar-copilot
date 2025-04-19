"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isPast, isWeekend } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { CalendarEventType } from "@/types/calendar"

interface CalendarWidgetProps {
    events?: CalendarEventType[]
    onDateClick?: (date: Date) => void
}

export function CalendarWidget({ events = [], onDateClick }: CalendarWidgetProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())

    // Generate calendar days for the current month
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Calculate the days that have events
    const daysWithEvents = events.reduce((acc: Record<string, boolean>, event) => {
        if (!event.start?.dateTime) return acc
        const eventDate = format(new Date(event.start.dateTime), 'yyyy-MM-dd')
        acc[eventDate] = true
        return acc
    }, {})

    // Navigate to previous month
    const prevMonth = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(prev.getMonth() - 1)
            return newDate
        })
    }

    // Navigate to next month
    const nextMonth = () => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev)
            newDate.setMonth(prev.getMonth() + 1)
            return newDate
        })
    }

    // Handle day click
    const handleDayClick = (date: Date) => {
        if (onDateClick) onDateClick(date)
    }

    return (
        <div className="bg-white rounded-lg border shadow p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-md font-medium">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex space-x-1">
                    <button
                        onClick={prevMonth}
                        className="p-1 rounded-full hover:bg-gray-100"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-1 rounded-full hover:bg-gray-100"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-xs font-medium text-gray-500">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, i) => {
                    const dayStr = format(day, 'yyyy-MM-dd')
                    const hasEvent = daysWithEvents[dayStr]

                    return (
                        <div
                            key={i}
                            onClick={() => handleDayClick(day)}
                            className={`
                h-8 w-8 flex items-center justify-center rounded-full text-xs cursor-pointer
                ${isToday(day) ? 'bg-primary text-white font-medium' : ''}
                ${hasEvent && !isToday(day) ? 'font-medium' : ''}
                ${isPast(day) && !isToday(day) ? 'text-gray-400' : 'text-gray-800'}
                ${isWeekend(day) && !isToday(day) ? 'text-gray-500' : ''}
                hover:bg-gray-100 hover:text-gray-900
              `}
                        >
                            {format(day, 'd')}
                            {hasEvent && !isToday(day) && (
                                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
} 