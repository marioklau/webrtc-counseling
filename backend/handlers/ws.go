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

// RoomManager handles the state of chat rooms
type RoomManager struct {
	rooms map[string]map[*websocket.Conn]bool
	mutex sync.Mutex
}

var manager = RoomManager{
	rooms: make(map[string]map[*websocket.Conn]bool),
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
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
