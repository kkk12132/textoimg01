import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { InferenceClient } from "@huggingface/inference";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

/* -------------------- HF CLIENT -------------------- */
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
if (!HF_TOKEN) {
  console.error("❌ HUGGINGFACE_API_KEY not set");
  process.exit(1);
}
const client = new InferenceClient(HF_TOKEN);

/* -------------------- HEALTH CHECK -------------------- */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Image Generator API is running",
    timestamp: new Date().toISOString(),
  });
});

/* -------------------- IMAGE GENERATION -------------------- */
app.post("/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }
    
    console.log("Received prompt:", prompt);
    console.log("Using HF token:", HF_TOKEN.substring(0, 6) + "...");
    
    // 🔥 IMAGE GENERATION (OFFICIAL WAY)
    const image = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: prompt,
    });

    // Convert Blob → Buffer
    const buffer = Buffer.from(await image.arrayBuffer());
    res.set("Content-Type", "image/png");
    res.send(buffer);
    console.log("✅ Image generated successfully");
    
  } catch (err) {
    console.error("❌ Image generation error:", err);
    res.status(500).json({
      error: "Image generation failed",
      details: err.message,
    });
  }
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
