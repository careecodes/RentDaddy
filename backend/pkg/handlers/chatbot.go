package handlers

import (
	"encoding/json"
	"net/http"
	"os"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

type ChatBotHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewChatBotHandler(pool *pgxpool.Pool, queries *db.Queries) *ChatBotHandler {
	return &ChatBotHandler{
		pool,
		queries,
	}
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Conversation []ChatMessage `json:"conversation"`
}

type ChatResponse struct {
	Reply string `json:"reply"`
}

func (c ChatBotHandler) ChatHandler(w http.ResponseWriter, r *http.Request) {
	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var messages []openai.ChatCompletionMessageParamUnion

	systemPrompt := openai.SystemMessage(
		" Your name is EZRA BOT. You are an apartment assistant AI that listens to rants, and also helps direct users to useful solutions, including but not limited to filing work orders or complaints. DONT ALWAYS MENTION COMPLAINTS/WORK ORDERS! You only know about your name, safe rants, and  helping with apartments, calling emergency services, and common tennant complaints, avoid other topics asside from realitively safe rants. Your responses should be in plain text without formatting.  Respond in under 200 chars. DO NOT RECCOMEND CONFRONTATION OR TALKING TO NEIGHBORS... if the user mentions that they do in fact want to make a complaint or work order point them to file one on the dashboard under the sidebar headding \"Work Orders & complaints\"")
	messages = append(messages, systemPrompt)

	for _, m := range req.Conversation {
		switch m.Role {
		case "user":
			messages = append(messages, openai.UserMessage(m.Content))
		case "assistant":
			messages = append(messages, openai.AssistantMessage(m.Content))
		}
	}

	client := openai.NewClient(option.WithAPIKey(os.Getenv("OPENAI_API_KEY")))
	params := openai.ChatCompletionNewParams{
		Messages: messages,
		Model:    openai.ChatModelGPT4oMini,
	}

	chatCompletion, err := client.Chat.Completions.New(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to get chat response", http.StatusInternalServerError)
		return
	}

	resp := ChatResponse{Reply: chatCompletion.Choices[0].Message.Content}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (c ChatBotHandler) ChatGetHandler(w http.ResponseWriter, r *http.Request) {
	message := r.URL.Query().Get("message")
	if message == "" {
		http.Error(w, "Message query parameter required", http.StatusBadRequest)
		return
	}
	client := openai.NewClient(option.WithAPIKey(os.Getenv("OPENAI_API_KEY")))
	params := openai.ChatCompletionNewParams{
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(message),
		},
		Model: openai.ChatModelGPT4o,
	}
	chatCompletion, err := client.Chat.Completions.New(r.Context(), params)
	if err != nil {
		http.Error(w, "Failed to get chat response", http.StatusInternalServerError)
		return
	}
	resp := ChatResponse{Reply: chatCompletion.Choices[0].Message.Content}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}
