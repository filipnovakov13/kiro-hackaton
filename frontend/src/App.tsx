import { useState } from "react";
import { ChatInterface } from "./components/chat/ChatInterface";
import { DocumentViewer } from "./components/document/DocumentViewer";
import { MessageList, Message } from "./components/chat/MessageList";
import { MessageInput } from "./components/chat/MessageInput";
import { StreamingMessage } from "./components/chat/StreamingMessage";

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Welcome to Iubar! Upload a document to start exploring, or ask me anything.",
      timestamp: new Date(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const handleSendMessage = (message: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Simulate streaming response (replace with real API call tomorrow)
    setIsStreaming(true);
    setStreamingContent("");

    const demoResponse =
      "This is a demo response. Tomorrow we'll connect this to the backend API for real AI responses with document context.";
    let index = 0;

    const interval = setInterval(() => {
      if (index < demoResponse.length) {
        setStreamingContent((prev) => prev + demoResponse[index]);
        index++;
      } else {
        clearInterval(interval);
        setIsStreaming(false);

        // Add complete message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: demoResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
      }
    }, 30);
  };

  // Demo document content
  const demoDocument = `# Welcome to Iubar

## What is Iubar?

Iubar is an AI-enhanced personal knowledge management system. It helps you explore and understand your documents through contextual conversations.

### Key Features

- **Document Upload**: Upload PDFs, text files, or paste URLs
- **AI Chat**: Ask questions about your documents
- **Contextual Understanding**: AI references specific sections
- **Focus Caret**: Click words to focus AI attention

### Getting Started

1. Upload a document using the interface
2. Start asking questions in the chat
3. Click on words in the document to focus the AI's attention
4. Explore your knowledge base naturally

---

*This is a demo document. Upload your own to get started!*`;

  const documentContent = (
    <DocumentViewer
      content={demoDocument}
      title="Welcome Guide"
      isLoading={false}
    />
  );

  const chatContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <MessageList messages={messages} isLoading={isStreaming} />
      {isStreaming && (
        <StreamingMessage content={streamingContent} isStreaming={true} />
      )}
      <MessageInput onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );

  return (
    <ChatInterface
      documentContent={documentContent}
      chatContent={chatContent}
    />
  );
}

export default App;
