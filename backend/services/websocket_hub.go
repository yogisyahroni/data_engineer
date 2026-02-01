package services

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/gofiber/websocket/v2"
)

// WebSocketMessage represents a message sent via WebSocket
type WebSocketMessage struct {
	Type    string      `json:"type"`    // notification, activity, system
	UserID  string      `json:"userId"`  // Target user ID
	Payload interface{} `json:"payload"` // Message payload
}

// WebSocketClient represents a connected WebSocket client
type WebSocketClient struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

// WebSocketHub manages WebSocket connections and message broadcasting
type WebSocketHub struct {
	// Registered clients by user ID
	clients map[string]map[*WebSocketClient]bool

	// Register requests from clients
	register chan *WebSocketClient

	// Unregister requests from clients
	unregister chan *WebSocketClient

	// Broadcast messages to specific users
	broadcast chan *WebSocketMessage

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients:    make(map[string]map[*WebSocketClient]bool),
		register:   make(chan *WebSocketClient),
		unregister: make(chan *WebSocketClient),
		broadcast:  make(chan *WebSocketMessage, 256),
	}
}

// Run starts the WebSocket hub
func (h *WebSocketHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// registerClient registers a new client
func (h *WebSocketHub) registerClient(client *WebSocketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[client.UserID] == nil {
		h.clients[client.UserID] = make(map[*WebSocketClient]bool)
	}
	h.clients[client.UserID][client] = true

	log.Printf("[WebSocket] Client registered: UserID=%s, Total connections=%d",
		client.UserID, len(h.clients[client.UserID]))
}

// unregisterClient unregisters a client
func (h *WebSocketHub) unregisterClient(client *WebSocketClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.clients[client.UserID]; ok {
		if _, ok := clients[client]; ok {
			delete(clients, client)
			close(client.Send)

			if len(clients) == 0 {
				delete(h.clients, client.UserID)
			}

			log.Printf("[WebSocket] Client unregistered: UserID=%s, Remaining connections=%d",
				client.UserID, len(h.clients[client.UserID]))
		}
	}
}

// broadcastMessage broadcasts a message to specific user(s)
func (h *WebSocketHub) broadcastMessage(message *WebSocketMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	messageBytes, err := json.Marshal(message)
	if err != nil {
		log.Printf("[WebSocket] Failed to marshal message: %v", err)
		return
	}

	// Send to specific user
	if message.UserID != "" {
		if clients, ok := h.clients[message.UserID]; ok {
			for client := range clients {
				select {
				case client.Send <- messageBytes:
				default:
					// Client's send channel is full, skip
					log.Printf("[WebSocket] Client send buffer full: UserID=%s", message.UserID)
				}
			}
		}
	}
}

// BroadcastToUser sends a message to a specific user
func (h *WebSocketHub) BroadcastToUser(userID string, messageType string, payload interface{}) {
	message := &WebSocketMessage{
		Type:    messageType,
		UserID:  userID,
		Payload: payload,
	}
	h.broadcast <- message
}

// BroadcastToWorkspace sends a message to all users in a workspace
func (h *WebSocketHub) BroadcastToWorkspace(workspaceID string, userIDs []string, messageType string, payload interface{}) {
	for _, userID := range userIDs {
		h.BroadcastToUser(userID, messageType, payload)
	}
}

// GetConnectedUsers returns the list of currently connected user IDs
func (h *WebSocketHub) GetConnectedUsers() []string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make([]string, 0, len(h.clients))
	for userID := range h.clients {
		users = append(users, userID)
	}
	return users
}

// GetConnectionCount returns the total number of active connections
func (h *WebSocketHub) GetConnectionCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	count := 0
	for _, clients := range h.clients {
		count += len(clients)
	}
	return count
}

// IsUserConnected checks if a user has any active connections
func (h *WebSocketHub) IsUserConnected(userID string) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, ok := h.clients[userID]
	return ok && len(clients) > 0
}

// Register adds a client to the hub
func (h *WebSocketHub) Register(client *WebSocketClient) {
	h.register <- client
}

// Unregister removes a client from the hub
func (h *WebSocketHub) Unregister(client *WebSocketClient) {
	h.unregister <- client
}
