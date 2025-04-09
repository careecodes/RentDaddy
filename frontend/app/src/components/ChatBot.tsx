import React, { useState, useCallback, useEffect } from "react";
import ChatBot from "react-chatbotify";
// Import types from react-chatbotify
import type { Params } from "react-chatbotify";

// Define Message type for our conversation
interface Message {
    role: "user" | "assistant";
    content: string;
}

// Define props to make the component more configurable
interface MyChatBotProps {
    apiEndpoint?: string;
    primaryColor?: string;
    secondaryColor?: string;
    botName?: string;
}

const MyChatBot: React.FC<MyChatBotProps> = ({
    apiEndpoint,
    primaryColor = "#00674f",
    secondaryColor = "#00674f",
    botName = "EZRA Bot"
}) => {
    // Get backend URL from environment variables or props
    const [backendUrl, setBackendUrl] = useState<string>("");

    useEffect(() => {
        if (apiEndpoint) {
            // If apiEndpoint is directly provided, use it as is
            setBackendUrl(apiEndpoint);
        } else {
            // Otherwise construct from base URL
            const baseUrl = import.meta.env.VITE_BACKEND_URL ?? "https://api.curiousdev.net";

            // Ensure we don't double up on /api/chat
            const endpoint = baseUrl.endsWith('/api/chat') ?
                baseUrl :
                `${baseUrl}/api/chat`;

            setBackendUrl(endpoint);
        }
    }, [apiEndpoint]);

    // Store conversation history
    const [conversation, setConversation] = useState<Message[]>([]);

    // ChatBot configuration settings
    const settings = {
        chatHistory: { storageKey: "ezra_chat_conversation" },
        general: {
            primaryColor: primaryColor,
            secondaryColor: secondaryColor,
            showHeader: true,
            showFooter: false,
            showInputRow: true,
            embedded: false,
        },
        tooltip: {
            mode: "START",
            text: "Have an issue? Chat with me!",
        },
        header: {
            title: <div style={{ cursor: "pointer", margin: 0, fontSize: 20, fontWeight: "bold" }}>{botName}</div>,
            showAvatar: false,
        },
        emoji: {
            disabled: true,
        },
        toast: {
            maxCount: 3,
            forbidOnMax: false,
            dismissOnClick: true,
        },
        notification: {
            showCount: false,
        },
        chatButton: {
            icon: "logo-with-bg.png",
        },
    };

    // Handle chat communication with server - using correct Params type
    const callServerChat = useCallback(async (params: Params) => {
        try {
            // Create user message
            const userMessage: Message = {
                role: "user",
                content: params.userInput,
            };

            // Update conversation with user message
            const updatedConversation = [...conversation, userMessage];
            setConversation(updatedConversation);

            // Call API endpoint
            const response = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversation: updatedConversation }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();

            // Create assistant message
            const assistantMessage: Message = {
                role: "assistant",
                content: data.reply,
            };

            // Update conversation with assistant response
            setConversation([...updatedConversation, assistantMessage]);

            // Inject message into chatbot UI - returning the message for type compatibility
            return data.reply;
        } catch (error) {
            console.error("Chat API error:", error);
            return "Unable to load model, try again later.";
        }
    }, [conversation, backendUrl]);

    // Define the chatbot flow with correct Params type
    const flow = {
        start: {
            message: `Hello there! I'm ${botName}, your helpful AI apartment assistant!`,
            path: "loop",
        },
        loop: {
            message: callServerChat,
            path: "loop",
        },
    };

    return (
        <ChatBot
            settings={settings}
            flow={flow}
        />
    );
};

export default MyChatBot;