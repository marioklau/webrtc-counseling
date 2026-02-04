package main

import (
	"counseling-webrtc/database"
	"counseling-webrtc/routes"

	"fmt"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	database.ConnectDB()
	r := gin.Default()

	// CORS Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	routes.RegisterRoutes(r)

	// Check for TLS certificates
	certFile := "certs/cert.pem"
	keyFile := "certs/key.pem"
	if _, err := os.Stat(certFile); err == nil {
		if _, err := os.Stat(keyFile); err == nil {
			fmt.Println("Starting Server on :8080 (HTTPS/WSS)...")
			if err := r.RunTLS(":8080", certFile, keyFile); err != nil {
				fmt.Printf("Initial TLS start failed: %v\nFalling back to HTTP...\n", err)
				r.Run(":8080")
			}
			return
		}
	}

	fmt.Println("Starting Server on :8080 (HTTP)...")
	r.Run(":8080")
}
