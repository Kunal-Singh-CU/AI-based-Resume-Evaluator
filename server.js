const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const Groq = require("groq-sdk");
const { spawnSync } = require("child_process");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// ---------- SAFE AI PARSER ----------
function safeParseAI(content) {
    try {
        content = content.replace(/```json/g, "").replace(/```/g, "");

        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
    } catch (e) {
        console.log("❌ JSON Parse Error:", e.message);
    }

    console.log("❌ RAW AI RESPONSE:", content);

    return {
        score: 60,
        strengths: ["Basic technical knowledge"],
        weaknesses: ["Lacks measurable achievements"],
        missingSkills: ["Industry-standard tools"],
        suggestions: ["Add real-world project impact with metrics"]
    };
}

function extractFeatures(skills, projects, experience, education) {

    var skillsCount = skills ? skills.split(",").length : 0;
    var projectsCount = projects ? projects.split("\n").length : 0;

    var experienceYears = 0;
    if (experience) {
        var match = experience.match(/\d+/);
        if (match) experienceYears = parseInt(match[0]);
    }

    var educationLevel = 1;
    if (education) {
        var edu = education.toLowerCase();
        if (edu.includes("bachelor")) educationLevel = 2;
        if (edu.includes("master")) educationLevel = 3;
        if (edu.includes("phd")) educationLevel = 4;
    }

    return [skillsCount, projectsCount, experienceYears, educationLevel];
}

function getMLScore(features) {
    try {
        const result = spawnSync("python", [
            "predict.py",
            String(features[0]),
            String(features[1]),
            String(features[2]),
            String(features[3])
        ]);

        const output = result.stdout.toString().trim();
        return parseInt(output) || 60;

    } catch (e) {
        return 60;
    }
}

app.post("/analyze", async(req, res) => {

    const { name, email, role, skills, projects, experience, education } = req.body;

    const resumeText = `
Candidate Profile:

Name: ${name}
Target Role: ${role}

Experience:
${experience}

Skills:
${skills}

Projects:
${projects}

Education:
${education}

Instructions:
- Evaluate relevance to ${role}
- Skills are comma-separated → treat individually
- If a skill exists → DO NOT mark it missing
- Check projects impact
- Check measurable experience
`;

    try {

        // ---------- AI ANALYSIS ----------
        const ai = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{
                    role: "system",
                    content: `
You are a highly strict ATS (Applicant Tracking System) and senior recruiter.

Analyze the resume like a REAL company would.

  IMPORTANT:
- Output ONLY pure JSON
- Do NOT use markdown
- Do NOT add text before or after JSON

Return format:
{
"score": number (0-100),
"strengths": [],
"weaknesses": [],
"missingSkills": [],
"suggestions": []
}

Rules:
- Be strict
- No generic answers
- No repetition
- Skills are comma-separated → treat individually
- If skill exists → DO NOT mark missing
`
                },
                {
                    role: "user",
                    content: resumeText
                }
            ]
        });

        console.log("AI RESPONSE:", ai.choices[0].message.content);

        const aiData = safeParseAI(ai.choices[0].message.content);

        // ---------- ML SCORE ----------
        const features = extractFeatures(skills, projects, experience, education);
        const mlScore = getMLScore(features);

        // ---------- FINAL SCORE ----------
        const finalScore = aiData.score ?
            Math.round((aiData.score + mlScore) / 2) :
            mlScore;

        // ---------- FETCH JOBS ----------
        const titles = new Set();
        const jobs = [];

        for (let page = 1; page <= 2; page++) {

            const jobResponse = await axios.get(
                "https://api.adzuna.com/v1/api/jobs/in/search/" + page, {
                    params: {
                        app_id: process.env.ADZUNA_APP_ID,
                        app_key: process.env.ADZUNA_APP_KEY,
                        results_per_page: 20,
                        what: role
                    },
                    timeout: 10000
                }
            );

            const results = jobResponse.data.results || [];

            for (let i = 0; i < results.length; i++) {

                const job = results[i];
                if (!job.title) continue;

                const title = job.title.trim().toLowerCase();

                if (!titles.has(title) && jobs.length < 20) {

                    titles.add(title);

                    let company = "Unknown Company";
                    let location = "Unknown Location";

                    if (job.company && job.company.display_name) {
                        company = job.company.display_name;
                    }

                    if (job.location && job.location.display_name) {
                        location = job.location.display_name;
                    }

                    jobs.push({
                        title: job.title,
                        company: company,
                        location: location,
                        link: job.redirect_url
                    });
                }

                if (jobs.length >= 20) break;
            }

            if (jobs.length >= 20) break;
        }

        res.json({
            score: finalScore,
            strengths: aiData.strengths || [],
            weaknesses: aiData.weaknesses || [],
            missingSkills: aiData.missingSkills || [],
            suggestions: aiData.suggestions || [],
            jobs: jobs
        });

    } catch (error) {

        console.error("Server Error:", error.message);

        res.status(500).json({
            error: "AI Analysis Failed"
        });
    }

});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});