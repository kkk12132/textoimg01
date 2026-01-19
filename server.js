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

    // Get API key from environment variable
    const API_KEY = process.env.HUGGINGFACE_API_KEY;
    
    if (!API_KEY) {
      console.error("❌ No API key found!");
      return res.status(500).json({ 
        error: "API key not configured",
        details: "Please set HUGGINGFACE_API_KEY environment variable in Render dashboard"
      });
    }
    
    console.log("Using API key:", API_KEY.substring(0, 10) + "...");

    // Try multiple working models
    const models = [
      "stabilityai/stable-diffusion-2-1",
      "runwayml/stable-diffusion-v1-5",
      "CompVis/stable-diffusion-v1-4"
    ];

    let lastError = null;
    
    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              inputs: prompt,
              options: {
                wait_for_model: true
              }
            }),
          }
        );

        console.log(`Response status: ${response.status}`);

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          
          if (arrayBuffer.byteLength === 0) {
            console.log(`❌ Model ${model} returned empty response`);
            lastError = "Empty response from model";
            continue;
          }

          const buffer = Buffer.from(arrayBuffer);
          res.set("Content-Type", "image/png");
          res.send(buffer);
          
          console.log(`✅ Image generated successfully using ${model} (${buffer.length} bytes)`);
          return;
        } else {
          const errorText = await response.text();
          console.log(`❌ Model ${model} failed (${response.status}):`, errorText);
          lastError = errorText;
          
          // If model is loading, wait before trying next
          if (errorText.includes("loading") || errorText.includes("currently loading")) {
            console.log("Model is loading, waiting 3 seconds...");
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      } catch (err) {
        console.log(`❌ Model ${model} error:`, err.message);
        lastError = err.message;
      }
    }

    // If all models failed
    console.error("❌ All models failed. Last error:", lastError);
    return res.status(500).json({ 
      error: "All image generation models failed", 
      details: lastError,
      suggestion: "Please check: 1) Your API token is valid and has not expired, 2) Try generating a new token at https://huggingface.co/settings/tokens"
    });

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

