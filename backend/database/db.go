package database

import (
	"database/sql"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func ConnectDB() {
	// XAMPP Default: root user, no password, localhost:3306
	dsn := "root:@tcp(127.0.0.1:3306)/counseling_db?parseTime=true"

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to open database connection:", err)
	}

	// Retry connection loop (in case MySQL is slow to start)
	for i := 0; i < 5; i++ {
		err = db.Ping()
		if err == nil {
			break
		}
		log.Printf("Waiting for Database... (%d/5)", i+1)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatal("Could not connect to MySQL Database (is XAMPP running?):", err)
	}

	DB = db
	log.Println("Database Connected Successfully (MySQL)")

	// Auto-migrate (for dev simplicity)
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS psychologist_schedules (
			id INT AUTO_INCREMENT PRIMARY KEY,
			psychologist_id INT NOT NULL,
			day_of_week INT NOT NULL,
			start_time TIME NOT NULL,
			end_time TIME NOT NULL,
			is_active BOOLEAN DEFAULT TRUE,
			FOREIGN KEY (psychologist_id) REFERENCES psychologists(id) ON DELETE CASCADE
		);
	`)
	if err != nil {
		log.Println("Auto-migration failed:", err)
	}

	// Migration: Add session_notes to bookings if not exists
	_, err = db.Exec(`
		SELECT session_notes FROM bookings LIMIT 1
	`)
	if err != nil {
		// Column likely doesn't exist, try to add it
		_, err = db.Exec(`ALTER TABLE bookings ADD COLUMN session_notes TEXT`)
		if err != nil {
			log.Println("Failed to add session_notes column:", err)
		} else {
			log.Println("Added session_notes column to bookings table")
		}
	}
}
