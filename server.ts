import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Gemini Solar Engineering Assistant Endpoint
app.post('/api/gemini/solar-assistant', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemInstruction = `You are the Solar.IOT Engineering & Science Assistant, an expert AI created to assist students, teachers, solar researchers, and engineers.
You specialize in:
1. Photovoltaic engineering: Monocrystalline panel physics, I-V curves, P-V derating, temperature coefficients, dust soiling attenuation (15%-35% transmission loss).
2. Hardware & IoT: ESP32, ESP-01 (ESP8266), INA219 current/voltage sensor over I2C, LM35 analog temperature sensor (10mV/°C), FC-37 raindrop precipitation sensor, 12V DC water pump relay, and motorized silicone squeegee wiper arm (GPIO 27).
3. Automated cleaning logic: Water conservation, avoiding cold-water thermal shock on hot glass, 3:00 AM nightly automated sweeps, post-rain squeegee wiping to prevent mineral scaling.
4. Firmware development: Arduino C++ (.ino), Firebase Realtime Database REST API, WiFi reconnection loops, and dual-core multitasking.
5. School & Research projects: Helping students and teachers understand data, run science experiments, calculate battery storage, inverter sizing, and write academic reports.

Provide clear, supportive, highly educational, technically precise answers formatted nicely with markdown bullet points and code snippets when requested. Keep explanations intuitive yet mathematically sound.`;

    const contents = context 
      ? `System Context: ${JSON.stringify(context)}\n\nUser Question: ${prompt}`
      : prompt;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to process AI request' });
  }
});

// Mount Vite in dev mode or serve static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

startServer();
