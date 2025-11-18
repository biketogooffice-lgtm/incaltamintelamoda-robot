import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/ask", async (req, res) => {
  const question = req.body.question;

  const prompt = `
Client întreabă: "${question}"

Fă un răspuns profesional, scurt, în limba română.
Include GEO (oraș / zonă România) dacă e relevant.
Sugerează produse de pe site-ul: incaltamintelamoda.ro.
Nu inventa produse care nu există.
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  res.send({ answer: data.choices[0].message.content });
});

app.listen(3000, () => console.log("Server OpenAI activ pe portul 3000"));
