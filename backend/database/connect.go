package database

import (
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not found in .env")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	// Configure connection pool for optimal performance
	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Failed to get database instance: ", err)
	}

	// Connection pool settings
	sqlDB.SetMaxOpenConns(50)                  // Maximum number of open connections (reduced from default 100)
	sqlDB.SetMaxIdleConns(25)                  // Maximum number of idle connections (increased from default 10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute) // Maximum lifetime of a connection (reduced from 1 hour)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute) // Maximum idle time before closing connection

	log.Println("✅ Connected to Database (PostgreSQL)")
	log.Println("✅ Connection pool configured: MaxOpen=50, MaxIdle=25, MaxLifetime=30m, MaxIdleTime=10m")
}
