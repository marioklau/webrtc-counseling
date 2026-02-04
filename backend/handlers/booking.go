package handlers

import (
	"counseling-webrtc/database"
	"counseling-webrtc/models"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// =============================================
// CATEGORIES HANDLERS
// =============================================

// GetCategories returns all available categories
func GetCategories(c *gin.Context) {
	rows, err := database.DB.Query("SELECT id, name, name_en, description FROM categories ORDER BY id")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var cat models.Category
		var nameEn, desc sql.NullString
		if err := rows.Scan(&cat.ID, &cat.Name, &nameEn, &desc); err != nil {
			continue
		}
		if nameEn.Valid {
			cat.NameEN = nameEn.String
		}
		if desc.Valid {
			cat.Description = desc.String
		}
		categories = append(categories, cat)
	}

	if categories == nil {
		categories = []models.Category{}
	}

	c.JSON(http.StatusOK, categories)
}

// =============================================
// PSYCHOLOGISTS HANDLERS
// =============================================

// GetPsychologists returns all experts with their categories
func GetPsychologists(c *gin.Context) {
	categoryID := c.Query("category_id") // Optional filter by category
	dateParam := c.Query("date")         // YYYY-MM-DD
	timeParam := c.Query("time")         // HH:MM

	// Pre-fetch booked psychologists for this slot if date/time provided
	bookedPsychologists := make(map[int]bool)
	if dateParam != "" && timeParam != "" {
		// Construct format matching DB (assuming ISO string from frontend ends up as DATETIME)
		// Frontend sends: 2026-02-13T10:00:00Z
		// We need to match precise string or range?
		// Best to construct the string exactly as frontend sends it or handle generic DATETIME match
		// Since frontend sends `${dateStr}T${data.selectedTime}:00Z`, let's construct that
		targetTime := fmt.Sprintf("%sT%s:00Z", dateParam, timeParam)

		rows, err := database.DB.Query(`
			SELECT psychologist_id FROM bookings 
			WHERE schedule_time = ? AND status IN ('pending', 'approved')
		`, targetTime)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var pid int
				rows.Scan(&pid)
				bookedPsychologists[pid] = true
			}
		}
	}

	var rows *sql.Rows
	var err error

	if categoryID != "" {
		// Filter by category
		rows, err = database.DB.Query(`
			SELECT DISTINCT p.id, p.name, p.bio, p.is_available
			FROM psychologists p
			JOIN psychologist_categories pc ON p.id = pc.psychologist_id
			WHERE pc.category_id = ? AND p.is_available = TRUE
		`, categoryID)
	} else {
		// Get all
		rows, err = database.DB.Query("SELECT id, name, bio, is_available FROM psychologists WHERE is_available = TRUE")
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	var psychologists []models.Psychologist
	for rows.Next() {
		var p models.Psychologist
		var bio sql.NullString
		if err := rows.Scan(&p.ID, &p.Name, &bio, &p.IsAvailable); err != nil {
			fmt.Println("Scan error:", err)
			continue
		}
		if bio.Valid {
			p.Bio = bio.String
		}

		// Fetch categories for this psychologist
		p.Categories = getPsychologistCategories(p.ID)
		p.Specialties = formatSpecialties(p.Categories) // For backward compatibility

		// Fetch schedules
		p.Schedules = getPsychologistSchedules(p.ID)

		// Check conflict
		if bookedPsychologists[p.ID] {
			p.IsBooked = true
		}

		psychologists = append(psychologists, p)
	}

	if psychologists == nil {
		psychologists = []models.Psychologist{}
	}

	c.JSON(http.StatusOK, psychologists)
}

// Helper: Get categories for a psychologist
func getPsychologistCategories(psychologistID int) []models.Category {
	rows, err := database.DB.Query(`
		SELECT c.id, c.name, c.name_en
		FROM categories c
		JOIN psychologist_categories pc ON c.id = pc.category_id
		WHERE pc.psychologist_id = ?
	`, psychologistID)
	if err != nil {
		return []models.Category{}
	}
	defer rows.Close()

	var categories []models.Category
	for rows.Next() {
		var cat models.Category
		var nameEn sql.NullString
		if err := rows.Scan(&cat.ID, &cat.Name, &nameEn); err != nil {
			continue
		}
		if nameEn.Valid {
			cat.NameEN = nameEn.String
		}
		categories = append(categories, cat)
	}
	return categories
}

// Helper: Get schedules for a psychologist
func getPsychologistSchedules(psychologistID int) []models.Schedule {
	rows, err := database.DB.Query(`
		SELECT id, psychologist_id, day_of_week, start_time, end_time, is_active
		FROM psychologist_schedules
		WHERE psychologist_id = ? AND is_active = TRUE
	`, psychologistID)
	if err != nil {
		return []models.Schedule{}
	}
	defer rows.Close()

	var schedules []models.Schedule
	for rows.Next() {
		var s models.Schedule
		// Time in DB is usually "HH:MM:SS" string for TIME type
		var startTime, endTime string
		if err := rows.Scan(&s.ID, &s.PsychologistID, &s.DayOfWeek, &startTime, &endTime, &s.IsActive); err != nil {
			continue
		}
		s.StartTime = startTime
		s.EndTime = endTime
		schedules = append(schedules, s)
	}
	return schedules
}

// Helper: Format categories as comma-separated string for backward compatibility
func formatSpecialties(categories []models.Category) string {
	if len(categories) == 0 {
		return ""
	}
	result := ""
	for i, cat := range categories {
		if i > 0 {
			result += ", "
		}
		result += cat.Name
	}
	return result
}

// =============================================
// BOOKING HANDLERS
// =============================================

// CreateBooking handles booking requests
func CreateBooking(c *gin.Context) {
	var input struct {
		ClientName     string `json:"client_name" binding:"required"`
		ClientContact  string `json:"client_contact" binding:"required"`
		CategoryID     int    `json:"category_id" binding:"required"`
		Complaint      string `json:"complaint"` // Additional details (optional)
		PsychologistID int    `json:"psychologist_id" binding:"required"`
		ScheduleTime   string `json:"schedule_time" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check for existing booking (conflict check)
	var existingID int
	err := database.DB.QueryRow("SELECT id FROM bookings WHERE psychologist_id = ? AND schedule_time = ? AND status IN ('pending', 'approved')", input.PsychologistID, input.ScheduleTime).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Jadwal ini sudah dibooking oleh orang lain."})
		return
	}

	query := `INSERT INTO bookings (client_name, client_contact, category_id, complaint, psychologist_id, schedule_time, status) 
			  VALUES (?, ?, ?, ?, ?, ?, 'pending')`
	res, err := database.DB.Exec(query, input.ClientName, input.ClientContact, input.CategoryID, input.Complaint, input.PsychologistID, input.ScheduleTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create booking: " + err.Error()})
		return
	}

	id, _ := res.LastInsertId()

	// Notify Psychologist
	var psychoEmail string
	err = database.DB.QueryRow("SELECT email FROM psychologists WHERE id = ?", input.PsychologistID).Scan(&psychoEmail)
	if err == nil && psychoEmail != "" {
		SendNotification(psychoEmail, gin.H{
			"type":    "new_booking",
			"message": fmt.Sprintf("New booking request from %s", input.ClientName),
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Booking request sent", "booking_id": id})
}

// GetExpertBookings returns bookings for a specific psychologist
func GetExpertBookings(c *gin.Context) {
	email := c.Query("email")

	if email == "" {
		c.JSON(http.StatusOK, []models.Booking{})
		return
	}

	rows, err := database.DB.Query(`
		SELECT b.id, b.client_name, b.client_contact, b.complaint, cat.name, DATE_FORMAT(b.schedule_time, '%Y-%m-%dT%H:%i:%s'), b.status, b.session_notes, b.room_id, p.name 
		FROM bookings b
		JOIN psychologists p ON b.psychologist_id = p.id
		JOIN categories cat ON b.category_id = cat.id
		WHERE p.email = ?
		ORDER BY b.schedule_time ASC
	`, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	var bookings []models.Booking
	for rows.Next() {
		var b models.Booking
		var notes, roomID sql.NullString

		if err := rows.Scan(&b.ID, &b.ClientName, &b.ClientContact, &b.Complaint, &b.CategoryName, &b.ScheduleTime, &b.Status, &notes, &roomID, &b.PsychologistName); err != nil {
			fmt.Println("Scan error:", err)
			continue
		}
		if notes.Valid {
			b.SessionNotes = notes.String
		}
		if roomID.Valid {
			b.RoomID = roomID.String
		}
		bookings = append(bookings, b)
	}

	if bookings == nil {
		bookings = []models.Booking{}
	}

	c.JSON(http.StatusOK, bookings)
}

// UpdateBookingStatus (Approve/Reject)
func UpdateBookingStatus(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var roomID string
	if input.Status == "approved" {
		roomID = uuid.New().String()
	}

	_, err := database.DB.Exec("UPDATE bookings SET status = ?, room_id = ? WHERE id = ?", input.Status, roomID, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}

	// Notify Client
	var clientContact string
	err = database.DB.QueryRow("SELECT client_contact FROM bookings WHERE id = ?", id).Scan(&clientContact)
	fmt.Printf("[NOTIFY DEBUG] Booking ID: %s, Status: %s, Client Contact: '%s'\n", id, input.Status, clientContact)
	if err == nil && clientContact != "" {
		fmt.Printf("[NOTIFY DEBUG] Sending notification to: '%s'\n", clientContact)
		SendNotification(clientContact, gin.H{
			"type":    "booking_updated",
			"status":  input.Status,
			"room_id": roomID,
			"message": fmt.Sprintf("Your booking has been %s", input.Status),
		})
	} else if err != nil {
		fmt.Printf("[NOTIFY DEBUG] Error getting client contact: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status updated", "room_id": roomID})
}

// RejectBooking rejects a booking and stores the rejection reason
func RejectBooking(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Alasan penolakan wajib diisi"})
		return
	}

	// Get client contact before updating
	var clientContact, clientName string
	err := database.DB.QueryRow("SELECT client_contact, client_name FROM bookings WHERE id = ?", id).Scan(&clientContact, &clientName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Booking not found"})
		return
	}

	// Update the booking status and store rejection reason
	_, err = database.DB.Exec("UPDATE bookings SET status = 'rejected', rejection_reason = ? WHERE id = ?", input.Reason, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject booking"})
		return
	}

	// Notify Client with rejection reason
	if clientContact != "" {
		SendNotification(clientContact, gin.H{
			"type":    "booking_rejected",
			"message": fmt.Sprintf("Booking Anda ditolak. Alasan: %s", input.Reason),
			"reason":  input.Reason,
		})
	}

	fmt.Printf("[REJECT] Booking ID: %s for %s rejected. Reason: %s\n", id, clientName, input.Reason)
	c.JSON(http.StatusOK, gin.H{"message": "Booking rejected"})
}

// UpdatePsychologistSchedule sets the availability for an expert
func UpdatePsychologistSchedule(c *gin.Context) {
	// Parse input: Expecting a list of schedules
	var input struct {
		Email     string            `json:"email" binding:"required"`
		Schedules []models.Schedule `json:"schedules" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get Psychologist ID
	var psychoID int
	err := database.DB.QueryRow("SELECT id FROM psychologists WHERE email = ?", input.Email).Scan(&psychoID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Psychologist not found"})
		return
	}

	// Transaction: Delete existing schedules and insert new ones
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB Transaction Error"})
		return
	}

	// 1. Delete old schedules
	_, err = tx.Exec("DELETE FROM psychologist_schedules WHERE psychologist_id = ?", psychoID)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset schedules"})
		return
	}

	// 2. Insert new schedules
	stmt, err := tx.Prepare("INSERT INTO psychologist_schedules (psychologist_id, day_of_week, start_time, end_time, is_active) VALUES (?, ?, ?, ?, ?)")
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare insert"})
		return
	}
	defer stmt.Close()

	for _, s := range input.Schedules {
		if s.IsActive {
			_, err = stmt.Exec(psychoID, s.DayOfWeek, s.StartTime, s.EndTime, true)
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to insert schedule: " + err.Error()})
				return
			}
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Schedule updated successfully"})
}

// GetClientBookings returns bookings for a specific client email
func GetClientBookings(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}

	// Fetch bookings
	rows, err := database.DB.Query(`
		SELECT b.id, b.client_name, b.complaint, DATE_FORMAT(b.schedule_time, '%Y-%m-%dT%H:%i:%s'), b.status, IFNULL(b.room_id, ''), IFNULL(b.session_notes, ''), IFNULL(b.rejection_reason, ''), IFNULL(p.name, 'Unknown Psychologist')
		FROM bookings b
		LEFT JOIN psychologists p ON b.psychologist_id = p.id
		WHERE b.client_contact = ?
		ORDER BY b.schedule_time DESC
	`, email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error: " + err.Error()})
		return
	}
	defer rows.Close()

	var bookings []models.Booking
	for rows.Next() {
		var b models.Booking
		if err := rows.Scan(&b.ID, &b.ClientName, &b.Complaint, &b.ScheduleTime, &b.Status, &b.RoomID, &b.SessionNotes, &b.RejectionReason, &b.PsychologistName); err != nil {
			fmt.Println("Scan error:", err)
			continue
		}
		bookings = append(bookings, b)
	}

	if bookings == nil {
		bookings = []models.Booking{}
	}

	c.JSON(http.StatusOK, bookings)
}

// UpdateSessionNotes updates notes for a booking
func UpdateSessionNotes(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Notes string `json:"notes" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := database.DB.Exec("UPDATE bookings SET session_notes = ? WHERE id = ?", input.Notes, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Update failed"})
		return
	}

	// Notify Client
	var clientContact string
	database.DB.QueryRow("SELECT client_contact FROM bookings WHERE id = ?", id).Scan(&clientContact)
	if clientContact != "" {
		SendNotification(clientContact, gin.H{
			"type":    "booking_updated",
			"status":  "notes_added",
			"message": "Psikolog telah menambahkan catatan sesi.",
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notes updated"})
}

// CheckRoomStatus checks if a room session is still valid (within 1 hour of scheduled time)
func CheckRoomStatus(c *gin.Context) {
	roomID := c.Param("roomId")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID is required", "valid": false})
		return
	}

	var scheduleTime string
	var status string
	err := database.DB.QueryRow(`
		SELECT DATE_FORMAT(schedule_time, '%Y-%m-%dT%H:%i:%s'), status 
		FROM bookings 
		WHERE room_id = ?
	`, roomID).Scan(&scheduleTime, &status)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found", "valid": false})
		return
	}

	// Check if booking is approved
	if status != "approved" {
		c.JSON(http.StatusOK, gin.H{
			"valid":  false,
			"reason": "Booking belum disetujui atau sudah selesai",
			"status": status,
		})
		return
	}

	// Parse schedule time and check if within 1 hour window
	// We need to import "time" package
	// For now, we'll return the schedule_time and let frontend handle the logic
	// OR we can do server-side check

	c.JSON(http.StatusOK, gin.H{
		"valid":         true,
		"schedule_time": scheduleTime,
		"status":        status,
	})
}
