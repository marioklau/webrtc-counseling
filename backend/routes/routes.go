package routes

import (
	"counseling-webrtc/handlers"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine) {
	public := r.Group("/api/public")
	{
		public.GET("/categories", handlers.GetCategories)
		public.GET("/psychologists", handlers.GetPsychologists)
		public.POST("/booking", handlers.CreateBooking)
		public.GET("/my-bookings", handlers.GetClientBookings)
		public.POST("/login", handlers.ClientLogin)
	}

	expert := r.Group("/api/expert")
	{
		expert.GET("/bookings", handlers.GetExpertBookings)
		expert.PUT("/bookings/:id/status", handlers.UpdateBookingStatus)
	}

	api := r.Group("/api")
	{
		// api.POST("/booking", handlers.CreateBooking) // Moved to public
		// api.GET("/waiting-room", handlers.WaitingRoomStatus) // Legacy
		// api.GET("/signal", handlers.Signaling) // Legacy
		api.GET("/ws", handlers.WebSocketHandler)
	}
}
