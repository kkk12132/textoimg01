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

    // Get API key from environment variable or use hardcoded value
    const API_KEY = process.env.HUGGINGFACE_API_KEY || "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";
    
    console.log("Using API key:", API_KEY.substring(0, 10) + "...");

    // FIXED: Updated endpoint from api-inference to router
    const response = await fetch(
      "https://router.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer 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`,
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

