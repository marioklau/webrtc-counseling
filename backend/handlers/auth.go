package handlers

import (
	"counseling-webrtc/database"
	"counseling-webrtc/models"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ClientLogin handles client authentication
func ClientLogin(c *gin.Context) {
	var input struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fmt.Printf("Login attempt: email='%s', password='%s'\n", input.Email, input.Password)

	var client models.Client
	query := "SELECT id, email, password_hash FROM clients WHERE email = ?"
	err := database.DB.QueryRow(query, input.Email).Scan(&client.ID, &client.Email, &client.PasswordHash)

	if err == sql.ErrNoRows {
		fmt.Println("Error: Email not found in database")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email salah atau tidak terdaftar"})
		return
	} else if err != nil {
		fmt.Println("Database error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	fmt.Printf("Found client: email='%s', password_hash='%s'\n", client.Email, client.PasswordHash)

	// Plain text password comparison (for lab purposes)
	if input.Password != client.PasswordHash {
		fmt.Printf("Password mismatch: input='%s', stored='%s'\n", input.Password, client.PasswordHash)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Password salah"})
		return
	}

	fmt.Println("Login successful!")
	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"email":   client.Email,
	})
}
