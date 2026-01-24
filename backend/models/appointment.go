package models

import "time"

type Appointment struct {
	ID           string    `json:"id"`
	CounselorID  string    `json:"counselor_id"`
	AnonymousID  string    `json:"anonymous_id"`
	StartTime    time.Time `json:"start_time"`
	RoomID       string    `json:"room_id"`
}
