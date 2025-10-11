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

  // 🧠 Handlers
  const handleNewMessage = useCallback((message) => {
    if (message.data) setMessages((prev) => [...prev, message.data]);
  }, []);

  const handleOnlineUsers = useCallback((message) => {
    setOnlineUsers(message.users || []);
  }, []);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && isConnected) {
      websocketService.sendMessage(newMessage);
      setNewMessage("");
      websocketService.sendTyping(false);
    }
  };

  const handleInputTyping = () => {
    websocketService.sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      websocketService.sendTyping(false);
    }, 1000);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    websocketService.disconnect();
    onLogout();
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 text-white flex flex-col p-5">
        <div className="mb-8">
          <h2 className="text-xl font-semibold">Chat App</h2>
          <p className="text-sm opacity-80">Welcome, {user.username}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm mb-3 opacity-70">
            ONLINE USERS ({onlineUsers.length})
          </h3>
          <div className="space-y-2">
            {onlineUsers.map((u) => (
              <div
                key={u._id}
                className="flex items-center space-x-2 text-sm py-1"
              >
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                <span>{u.username}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-auto bg-red-500 hover:bg-red-600 text-white py-2 rounded-md text-sm font-medium transition"
        >
          Logout
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-white border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">General Chat</h3>
          <div
            className={`px-3 py-1 rounded text-xs font-medium ${
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isConnected ? "● Connected" : "● Disconnected"}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-200">
          {messages.map((msg, index) => (
            <div
              key={`${msg._id || "temp"}-${index}`}
              className={`mb-3 flex ${
                msg.username === user.username ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[60%] p-3 rounded-lg shadow-sm ${
                  msg.username === user.username
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-800"
                }`}
              >
                {msg.username !== user.username && (
                  <div className="text-xs font-semibold mb-1 opacity-80">
                    {msg.username}
                  </div>
                )}
                <div className="mb-1 text-sm">{msg.content}</div>
                <div className="text-[11px] opacity-70 text-right">
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          ))}

          {typingUsers.length > 0 && (
            <div className="text-sm italic text-gray-600 mt-2">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
              typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 bg-white border-t flex gap-2"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleInputTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className={`px-5 py-2 rounded-md text-white text-sm font-medium transition ${
              !newMessage.trim() || !isConnected
                ? "bg-blue-400 cursor-not-allowed opacity-50"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat;
