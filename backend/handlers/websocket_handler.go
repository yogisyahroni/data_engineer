package handlers

import (
	"insight-engine-backend/services"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

// WebSocketHandler handles WebSocket connections
type WebSocketHandler struct {
	wsHub *services.WebSocketHub
}

// NewWebSocketHandler creates a new WebSocket handler
func NewWebSocketHandler(wsHub *services.WebSocketHub) *WebSocketHandler {
	return &WebSocketHandler{
		wsHub: wsHub,
	}
}

// HandleConnection handles WebSocket connection upgrade and communication
func (h *WebSocketHandler) HandleConnection(c *websocket.Conn) {
	// Get user ID from locals (set by auth middleware)
	userID := c.Locals("userID")
	if userID == nil {
		log.Println("[WebSocket] No user ID in context")
		c.Close()
		return
	}

	userIDStr, ok := userID.(string)
	if !ok {
		log.Println("[WebSocket] Invalid user ID type")
		c.Close()
		return
	}

	// Create client
	client := &services.WebSocketClient{
		UserID: userIDStr,
		Conn:   c,
		Send:   make(chan []byte, 256),
	}

	// Register client
	h.wsHub.Register(client)

	// Start goroutines for reading and writing
	go h.writePump(client)
	h.readPump(client)
}

// readPump reads messages from the WebSocket connection
func (h *WebSocketHandler) readPump(client *services.WebSocketClient) {
	defer func() {
		h.wsHub.Unregister(client)
		client.Conn.Close()
	}()

	// Set read deadline
	client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	client.Conn.SetPongHandler(func(string) error {
		client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := client.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WebSocket] Error reading message: %v", err)
			}
			break
		}

		// Handle incoming messages (ping/pong, etc)
		log.Printf("[WebSocket] Received message from %s: %s", client.UserID, string(message))
	}
}

// writePump writes messages to the WebSocket connection
func (h *WebSocketHandler) writePump(client *services.WebSocketClient) {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		client.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-client.Send:
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Channel closed
				client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("[WebSocket] Error writing message: %v", err)
				return
			}

		case <-ticker.C:
			// Send ping
			client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// GetStats returns WebSocket connection statistics
func (h *WebSocketHandler) GetStats(c *fiber.Ctx) error {
	stats := fiber.Map{
		"connectedUsers":   h.wsHub.GetConnectedUsers(),
		"totalConnections": h.wsHub.GetConnectionCount(),
		"timestamp":        time.Now(),
	}

	return c.JSON(stats)
}
