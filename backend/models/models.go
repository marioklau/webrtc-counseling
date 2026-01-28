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
	Bio         string     `json:"bio"`
	IsAvailable bool       `json:"is_available"`
	CreatedAt   time.Time  `json:"created_at,omitempty"`
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
	ID             int       `json:"id"`
	ClientName     string    `json:"client_name"`
	ClientContact  string    `json:"client_contact"`
	CategoryID     int       `json:"category_id,omitempty"`
	CategoryName   string    `json:"category_name,omitempty"` // Joined field
	Complaint      string    `json:"complaint"`               // Additional details
	PsychologistID int       `json:"psychologist_id"`
	ScheduleTime   time.Time `json:"schedule_time"`
	Status         string    `json:"status"`
	RoomID         string    `json:"room_id"`
	SessionNotes   string    `json:"session_notes,omitempty"`
	ChatHistory    string    `json:"chat_history,omitempty"`
	CreatedAt      time.Time `json:"created_at,omitempty"`

	// Joins
	PsychologistName string `json:"psychologist_name,omitempty"`
}
