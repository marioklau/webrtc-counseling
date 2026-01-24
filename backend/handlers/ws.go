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

var rooms = make(map[string][]*websocket.Conn)
var mutex = &sync.Mutex{}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func WebSocketHandler(c *gin.Context) {
	roomID := c.Query("room")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	mutex.Lock()
	rooms[roomID] = append(rooms[roomID], conn)
	mutex.Unlock()

	defer func() {
		conn.Close()
	}()

	for {
		var msg Message
		if err := conn.ReadJSON(&msg); err != nil {
			log.Println(err)
			break
		}

		mutex.Lock()
		for _, peer := range rooms[roomID] {
			if peer != conn {
				peer.WriteJSON(msg)
			}
		}
		mutex.Unlock()
	}
}
