package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func CreateBooking(c *gin.Context) {
	var req struct {
		CounselorID string `json:"counselor_id"`
		StartTime   string `json:"start_time"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	roomID := uuid.New().String()

	c.JSON(http.StatusOK, gin.H{
		"room_id":    roomID,
		"start_time": req.StartTime,
		"status":     "BOOKED",
	})
}

func WaitingRoomStatus(c *gin.Context) {
	startTime, _ := time.Parse(time.RFC3339, c.Query("start_time"))

	open := time.Now().After(startTime.Add(-15 * time.Minute))

	c.JSON(http.StatusOK, gin.H{
		"waiting_room_open": open,
	})
}
