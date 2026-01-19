// server.js
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

dotenv.config();

/* -------------------- APP SETUP -------------------- */
const app = express();

// CORS - Allow requests from your Vercel frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://your-frontend.vercel.app' // Update this after Vercel deployment
  ],
  credentials: true
}));

app.use(express.json());

/* -------------------- MONGODB -------------------- */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const Image = mongoose.model(
  "Image",
  new mongoose.Schema({
    prompt: String,
    image: Buffer,
    createdAt: { type: Date, default: Date.now },
  })
);

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

    // Fixed: Changed HUGGINGFACE_API_KEY1 to HUGGINGFACE_API_KEY
    if (!process.env.HUGGINGFACE_API_KEY) {
      return res.status(500).json({ error: "Hugging Face API key not set" });
    }

    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0",
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

    // Save image in MongoDB
    try {
      await Image.create({ prompt, image: buffer });
      console.log("✅ Image saved to MongoDB");
    } catch (mongoErr) {
      console.error("❌ MongoDB Save Error:", mongoErr);
      // Do not block user from getting image
    }

    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    console.error("❌ Image generation error:", err);
    res.status(500).json({ 
      error: "Image generation failed", 
      details: err.message 
    });
  }
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});