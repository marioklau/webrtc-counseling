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
}
