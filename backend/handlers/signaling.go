package handlers

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func Signaling(c *gin.Context) {
	// Placeholder WebSocket Signaling
	c.JSON(http.StatusOK, gin.H{
		"message": "WebRTC signaling endpoint",
	})
}
