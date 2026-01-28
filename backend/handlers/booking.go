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

	query := `INSERT INTO bookings (client_name, client_contact, category_id, complaint, psychologist_id, schedule_time, status) 
			  VALUES (?, ?, ?, ?, ?, ?, 'pending')`
	res, err := database.DB.Exec(query, input.ClientName, input.ClientContact, input.CategoryID, input.Complaint, input.PsychologistID, input.ScheduleTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create booking: " + err.Error()})
		return
	}

	id, _ := res.LastInsertId()
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
		SELECT b.id, b.client_name, b.client_contact, b.complaint, cat.name, b.schedule_time, b.status, b.session_notes, b.room_id, p.name 
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

	c.JSON(http.StatusOK, gin.H{"message": "Status updated", "room_id": roomID})
}

// GetClientBookings returns bookings for a specific client email
func GetClientBookings(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}

	rows, err := database.DB.Query(`
		SELECT b.id, b.client_name, b.client_contact, b.complaint, cat.name, b.schedule_time, b.status, b.room_id, p.name 
		FROM bookings b
		JOIN psychologists p ON b.psychologist_id = p.id
		JOIN categories cat ON b.category_id = cat.id
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
		var roomID sql.NullString

		if err := rows.Scan(&b.ID, &b.ClientName, &b.ClientContact, &b.Complaint, &b.CategoryName, &b.ScheduleTime, &b.Status, &roomID, &b.PsychologistName); err != nil {
			continue
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
