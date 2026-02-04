package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Message struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// RoomManager handles the state of chat rooms (Signaling)
type RoomManager struct {
	rooms map[string]map[*websocket.Conn]bool
	mutex sync.Mutex
}

var manager = RoomManager{
	rooms: make(map[string]map[*websocket.Conn]bool),
}

// NotificationManager handles user-specific notifications
type NotificationManager struct {
	clients map[string]*websocket.Conn // Map email -> connection
	mutex   sync.Mutex
}

var notifManager = NotificationManager{
	clients: make(map[string]*websocket.Conn),
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// SendNotification sends a message to a specific user by email
func SendNotification(email string, message interface{}) {
	notifManager.mutex.Lock()
	defer notifManager.mutex.Unlock()

	// Debug: List all connected clients
	log.Printf("[NOTIFY] Looking for client: '%s'. Connected clients: %d", email, len(notifManager.clients))
	for connectedEmail := range notifManager.clients {
		log.Printf("[NOTIFY]   - Connected: '%s'", connectedEmail)
	}

	client, ok := notifManager.clients[email]
	if !ok {
		log.Printf("[NOTIFY] Client '%s' NOT FOUND in connected clients!", email)
		return // User not connected
	}

	log.Printf("[NOTIFY] Sending message to client: '%s'", email)
	if err := client.WriteJSON(message); err != nil {
		log.Printf("[NOTIFY] Failed to send notification to %s: %v", email, err)
		client.Close()
		delete(notifManager.clients, email)
	} else {
		log.Printf("[NOTIFY] Successfully sent notification to '%s'", email)
	}
}

// NotificationHandler manages persistent connections for updates
func NotificationHandler(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email is required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Error upgrading notification connection:", err)
		return
	}

	notifManager.mutex.Lock()
	// Close existing connection if any (one active tab policy or overwrite)
	if existing, ok := notifManager.clients[email]; ok {
		existing.Close()
	}
	notifManager.clients[email] = conn
	notifManager.mutex.Unlock()

	// Keep connection alive
	defer func() {
		notifManager.mutex.Lock()
		if notifManager.clients[email] == conn {
			delete(notifManager.clients, email)
		}
		notifManager.mutex.Unlock()
		conn.Close()
	}()

	for {
		// Read messages - handle ping/pong to keep connection alive
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		// Parse message to check for ping
		var msg struct {
			Type string `json:"type"`
		}
		if err := json.Unmarshal(message, &msg); err == nil {
			if msg.Type == "ping" {
				// Respond with pong
				conn.WriteJSON(map[string]string{"type": "pong"})
			}
		}
	}
}

func WebSocketHandler(c *gin.Context) {
	roomID := c.Query("room")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "room is required"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Error upgrading connection:", err)
		return
	}

	manager.mutex.Lock()
	if _, ok := manager.rooms[roomID]; !ok {
		manager.rooms[roomID] = make(map[*websocket.Conn]bool)
	}

	clients := manager.rooms[roomID]
	if len(clients) >= 2 {
		manager.mutex.Unlock()
		conn.WriteJSON(Message{Type: "full"})
		conn.Close()
		return
	}

	manager.rooms[roomID][conn] = true

	// Notify others that a peer has joined if there's already someone else
	if len(manager.rooms[roomID]) > 1 {
		log.Printf("Room %s: Peer joined, notifying existing clients", roomID)
		for client := range manager.rooms[roomID] {
			if client != conn {
				client.WriteJSON(Message{Type: "peer-joined"})
			}
		}
	}
	manager.mutex.Unlock()

	defer func() {
		manager.mutex.Lock()
		if _, ok := manager.rooms[roomID]; ok {
			delete(manager.rooms[roomID], conn)
			// Notify remaining clients of disconnect
			for client := range manager.rooms[roomID] {
				client.WriteJSON(Message{Type: "peer-left"})
			}
			if len(manager.rooms[roomID]) == 0 {
				delete(manager.rooms, roomID)
			}
		}
		manager.mutex.Unlock()
		conn.Close()
	}()

	for {
		var msg Message
		if err := conn.ReadJSON(&msg); err != nil {
			log.Printf("Error reading json: %v", err)
			break
		}

		// Relay message to other peer in the room
		manager.mutex.Lock()
		if peers, ok := manager.rooms[roomID]; ok {
			for peer := range peers {
				if peer != conn {
					if err := peer.WriteJSON(msg); err != nil {
						log.Printf("Error writing json: %v", err)
						peer.Close()
						delete(peers, peer)
					}
				}
			}
		}
		manager.mutex.Unlock()
	}
}
