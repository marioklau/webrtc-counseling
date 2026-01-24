package routes

import (
	"counseling-webrtc/handlers"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.POST("/booking", handlers.CreateBooking)
		api.GET("/waiting-room", handlers.WaitingRoomStatus)
		api.GET("/signal", handlers.Signaling)
		api.GET("/ws", handlers.WebSocketHandler)
	}
}
