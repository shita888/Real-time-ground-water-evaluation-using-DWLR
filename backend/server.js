import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config(); // loads OPENAI_API_KEY from .env

const app = express();
app.use(express.json());

// Basic rate-limit and minimal protection recommended in production.

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, includeRealtime } = req.body;

    // Example: attach realtime data if requested (you can fetch actual sensor DB here)
    let augmentedMessages = Array.isArray(messages) ? [...messages] : [];
    if (includeRealtime) {
      // fetch latest groundwater readings from your DB or API (placeholder)
      const realtime = `Latest groundwater reading (sample): location X = 4.2m on 2025-09-19.`;
      augmentedMessages.push({
        role: "system",
        content: `Realtime data: ${realtime}`,
      });
    }

    // Strong system prompt to make the assistant JalDrishti-aware and helpful
    const systemPrompt = {
      role: "system",
      content:
        "You are JalDrishti Assistant, a helpful expert on groundwater data and the JalDrishti project. Answer concisely, cite real-time readings when provided, and ask clarifying questions only when necessary.",
    };

    const payload = {
      model: "gpt-4o-mini", // choose an available high-quality model your account supports
      messages: [systemPrompt, ...augmentedMessages],
      temperature: 0.2,
      max_tokens: 800,
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("OpenAI error:", r.status, text);
      return res.status(500).json({ error: "OpenAI API error", details: text });
    }

    const data = await r.json();
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
