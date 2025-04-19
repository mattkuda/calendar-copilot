"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface CalendarModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (eventData: {
        title: string
        datetime: string
        duration: number
        attendees: string[]
    }) => Promise<any>
}

export function CalendarModal({ isOpen, onClose, onSubmit }: CalendarModalProps) {
    const [title, setTitle] = useState("")
    const [datetime, setDatetime] = useState("")
    const [duration, setDuration] = useState(30)
    const [attendees, setAttendees] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!title.trim()) {
            setError("Title is required")
            return
        }

        if (!datetime) {
            setError("Date and time are required")
            return
        }

        try {
            setIsSubmitting(true)

            // Format attendees as array
            const attendeeList = attendees
                .split(",")
                .map(email => email.trim())
                .filter(email => email !== "")

            await onSubmit({
                title,
                datetime: new Date(datetime).toISOString(),
                duration,
                attendees: attendeeList
            })

            // Reset form
            setTitle("")
            setDatetime("")
            setDuration(30)
            setAttendees("")

        } catch (err) {
            setError("Failed to create event. Please try again.")
            console.error(err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                    disabled={isSubmitting}
                >
                    <X className="h-5 w-5" />
                </button>

                <h2 className="text-xl font-semibold mb-4">Create Calendar Event</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-800 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Event Title *
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Team Meeting"
                            disabled={isSubmitting}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="datetime" className="block text-sm font-medium text-gray-700 mb-1">
                            Date & Time *
                        </label>
                        <input
                            id="datetime"
                            type="datetime-local"
                            value={datetime}
                            onChange={(e) => setDatetime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            disabled={isSubmitting}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                            Duration (minutes)
                        </label>
                        <select
                            id="duration"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            disabled={isSubmitting}
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="attendees" className="block text-sm font-medium text-gray-700 mb-1">
                            Attendees (comma-separated emails)
                        </label>
                        <input
                            id="attendees"
                            type="text"
                            value={attendees}
                            onChange={(e) => setAttendees(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="user@example.com, user2@example.com"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating..." : "Create Event"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
} 