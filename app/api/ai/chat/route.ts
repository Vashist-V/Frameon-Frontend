import { NextRequest, NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type IncomingMessage = {
  role?: unknown;
  content?: unknown;
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const conversationHistory = Array.isArray(body.conversation_history) ? body.conversation_history : [];
  const messages: ChatMessage[] = conversationHistory.map((message: IncomingMessage) => ({
    role: ["user", "assistant", "system"].includes(String(message?.role))
      ? (message.role as ChatMessage["role"])
      : "user",
    content: String(message?.content ?? ""),
  }));

  messages.push({ role: "user", content: String(body.message ?? "") });

  const openAiKey = process.env.OPENAI_API_KEY;
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureKey = process.env.AZURE_OPENAI_APIKEY;
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;

  try {
    if (openAiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "gpt-3.5-turbo", messages, max_tokens: 512 }),
      });

      if (!response.ok) {
        return NextResponse.json({ error: "OpenAI request failed" }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json({ response: data.choices?.[0]?.message?.content ?? "" });
    }

    if (azureEndpoint && azureKey && azureDeployment) {
      const base = azureEndpoint.replace(/\/$/, "");
      const response = await fetch(
        `${base}/deployments/${azureDeployment}/chat/completions?api-version=2023-05-15`,
        {
          method: "POST",
          headers: {
            "api-key": azureKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages, max_tokens: 512 }),
        }
      );

      if (!response.ok) {
        return NextResponse.json({ error: "Azure OpenAI request failed" }, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json({ response: data.choices?.[0]?.message?.content ?? "" });
    }

    return NextResponse.json({
      response:
        "Frameon AI is unavailable because no OpenAI credentials are configured. Please set OPENAI_API_KEY or AZURE_OPENAI_{APIKEY,DEPLOYMENT} in the frontend deployment environment.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed" },
      { status: 500 }
    );
  }
}
