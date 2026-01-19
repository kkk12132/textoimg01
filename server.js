import dotenv from "dotenv";
import express from "express";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* -------------------- HEALTH CHECK -------------------- */
app.get("/", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "AI Image Generator API is running",
    timestamp: new Date().toISOString()
  });
});

/* -------------------- IMAGE GENERATION -------------------- */
app.post("/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("Received prompt:", prompt);

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    if (!process.env.HUGGINGFACE_API_KEY) {
      return res.status(500).json({ error: "Hugging Face API key not set" });
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Hugging Face API Error:", errorText);
      return res.status(500).json({ 
        error: "Hugging Face API failed", 
        details: errorText 
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.set("Content-Type", "image/png");
    res.send(buffer);
    
    console.log("✅ Image generated successfully");
  } catch (err) {
    console.error("❌ Image generation error:", err);
    res.status(500).json({ 
      error: "Image generation failed", 
      details: err.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
