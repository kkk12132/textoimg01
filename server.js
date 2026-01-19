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

    // Use the correct HF Inference endpoint format for text-to-image
    const model = "black-forest-labs/FLUX.1-schnell";
    const API_URL = `https://router.huggingface.co/hf-inference/models/${model}`;
    
    console.log(`Generating image with model: ${model}`);
    
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        inputs: prompt
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error (${response.status}):`, errorText);
      
      // Handle model loading state
      if (errorText.includes("loading") || errorText.includes("currently loading")) {
        return res.status(503).json({ 
          error: "Model is loading", 
          details: "The model is currently loading. Please try again in a few moments.",
          retryAfter: 20
        });
      }
      
      return res.status(500).json({ 
        error: "Image generation failed", 
        details: errorText 
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength === 0) {
      console.error("❌ Empty response from API");
      return res.status(500).json({ 
        error: "Empty response from model",
        details: "The model returned an empty response. Please try again."
      });
    }

    const buffer = Buffer.from(arrayBuffer);
    res.set("Content-Type", "image/png");
    res.send(buffer);
    
    console.log(`✅ Image generated successfully (${buffer.length} bytes)`);

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
