package models

import "time"

// Category represents a specialty/complaint category
type Category struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`    // Indonesian name
	NameEN      string `json:"name_en"` // English name
	Description string `json:"description"`
}

// Psychologist represents an expert/counselor
type Psychologist struct {
	ID          int        `json:"id"`
	Name        string     `json:"name"`
	Email       string     `json:"email,omitempty"`
	Specialties string     `json:"specialties"` // Backward compatible string format
	Categories  []Category `json:"categories"`  // New: array of categories
	Schedules   []Schedule `json:"schedules"`   // New: availability
	Bio         string     `json:"bio"`
	IsAvailable bool       `json:"is_available"`
	IsBooked    bool       `json:"is_booked"` // New: Check for specific slot conflict
	CreatedAt   time.Time  `json:"created_at,omitempty"`
}

// Schedule represents a psychologist's availability
type Schedule struct {
	ID             int    `json:"id"`
	PsychologistID int    `json:"psychologist_id"`
	DayOfWeek      int    `json:"day_of_week"` // 0=Sun, 1=Mon...
	StartTime      string `json:"start_time"`  // "HH:MM:SS"
	EndTime        string `json:"end_time"`    // "HH:MM:SS"
	IsActive       bool   `json:"is_active"`
}

// Client represents a user seeking counseling
type Client struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"created_at"`
}

// Booking represents a counseling session request
type Booking struct {
	ID              int    `json:"id"`
	ClientName      string `json:"client_name"`
	ClientContact   string `json:"client_contact"`
	CategoryID      int    `json:"category_id,omitempty"`
	CategoryName    string `json:"category_name,omitempty"` // Joined field
	Complaint       string `json:"complaint"`               // Additional details
	PsychologistID  int    `json:"psychologist_id"`
	ScheduleTime    string `json:"schedule_time"` // Original input string
	Status          string `json:"status"`        // pending, approved, rejected, completed
	RoomID          string `json:"room_id"`
	SessionNotes    string `json:"session_notes"`              // Expert notes
	RejectionReason string `json:"rejection_reason,omitempty"` // Reason for rejection
	ChatHistory     string `json:"chat_history,omitempty"`
	CreatedAt       string `json:"created_at"`

	// Joins
	PsychologistName string `json:"psychologist_name,omitempty"`
}
