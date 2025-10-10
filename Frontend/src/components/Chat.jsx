import { useCallback, useEffect, useRef, useState } from "react";
import { authAPI } from "../services/api";
import websocketService from "../services/websocket";

function Chat({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 🧠 Handler: new incoming message
  const handleNewMessage = useCallback((message) => {
    if (message.data) {
      setMessages((prev) => [...prev, message.data]);
    }
  }, []);

  // 🧠 Handler: update online users
  const handleOnlineUsers = useCallback((message) => {
    setOnlineUsers(message.users || []);
  }, []);

  // 🧠 Handler: show typing indicator
  const handleTyping = useCallback(
    (message) => {
      if (message.username === user.username) return;

      if (message.isTyping) {
        setTypingUsers((prev) =>
          prev.includes(message.username) ? prev : [...prev, message.username]
        );
      } else {
        setTypingUsers((prev) => prev.filter((u) => u !== message.username));
      }
    },
    [user.username]
  );

  // 🧠 Connect to WebSocket and load messages
  useEffect(() => {
    const initChat = async () => {
      try {
        const response = await authAPI.getMessages();
        setMessages(response.data);

        const token = localStorage.getItem("token");
        await websocketService.connect(token);
        setIsConnected(true);

        websocketService.on("chat_message", handleNewMessage);
        websocketService.on("online_users", handleOnlineUsers);
        websocketService.on("typing", handleTyping);
      } catch (error) {
        console.error("Failed to initialize chat:", error);
      }
    };

    initChat();

    return () => {
      websocketService.off("chat_message", handleNewMessage);
      websocketService.off("online_users", handleOnlineUsers);
      websocketService.off("typing", handleTyping);
      websocketService.disconnect();
    };
  }, [handleNewMessage, handleOnlineUsers, handleTyping]);

  // 🧠 Scroll chat to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🧠 Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && isConnected) {
      websocketService.sendMessage(newMessage);
      setNewMessage("");
      websocketService.sendTyping(false);
    }
  };

  // 🧠 Handle typing indicator
  const handleInputTyping = () => {
    websocketService.sendTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      websocketService.sendTyping(false);
    }, 1000);
  };

  // 🧠 Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    websocketService.disconnect();
    onLogout();
  };

  // 🧠 Time formatter
  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "250px",
          backgroundColor: "#2c3e50",
          color: "white",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ marginBottom: "30px" }}>
          <h2 style={{ margin: "0 0 10px 0" }}>Chat App</h2>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.8 }}>
            Welcome, {user.username}
          </p>
        </div>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: "14px",
              marginBottom: "15px",
              opacity: 0.8,
            }}
          >
            ONLINE USERS ({onlineUsers.length})
          </h3>
          <div>
            {onlineUsers.map((u) => (
              <div
                key={u._id}
                style={{
                  padding: "8px 0",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#2ecc71",
                    marginRight: "10px",
                  }}
                />
                <span>{u.username}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: "10px",
            backgroundColor: "#e74c3c",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginTop: "auto",
          }}
        >
          Logout
        </button>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div
          style={{
            padding: "20px",
            backgroundColor: "white",
            borderBottom: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: 0 }}>General Chat</h3>
          <div
            style={{
              padding: "5px 10px",
              backgroundColor: isConnected ? "#d4edda" : "#f8d7da",
              color: isConnected ? "#155724" : "#721c24",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            {isConnected ? "● Connected" : "● Disconnected"}
          </div>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            backgroundColor: "#ecf0f1",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg._id}
              style={{
                marginBottom: "15px",
                display: "flex",
                justifyContent:
                  msg.username === user.username ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "60%",
                  padding: "10px 15px",
                  backgroundColor:
                    msg.username === user.username ? "#007bff" : "white",
                  color: msg.username === user.username ? "white" : "#333",
                  borderRadius: "8px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                {msg.username !== user.username && (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "bold",
                      marginBottom: "5px",
                      opacity: 0.8,
                    }}
                  >
                    {msg.username}
                  </div>
                )}
                <div style={{ marginBottom: "5px" }}>{msg.content}</div>
                <div
                  style={{
                    fontSize: "11px",
                    opacity: 0.7,
                    textAlign: "right",
                  }}
                >
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          ))}

          {typingUsers.length > 0 && (
            <div
              style={{
                fontSize: "13px",
                fontStyle: "italic",
                color: "#666",
                marginTop: "10px",
              }}
            >
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
              typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: "20px",
            backgroundColor: "white",
            borderTop: "1px solid #ddd",
            display: "flex",
            gap: "10px",
          }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleInputTyping();
            }}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "14px",
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            style={{
              padding: "12px 30px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                !newMessage.trim() || !isConnected ? "not-allowed" : "pointer",
              opacity: !newMessage.trim() || !isConnected ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
