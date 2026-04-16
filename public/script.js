document.getElementById("resumeForm").addEventListener("submit", async function(e) {

    e.preventDefault();

    const resultSection = document.getElementById("results");
    resultSection.style.display = "block";

    const loading = document.getElementById("loading");
    loading.innerText = " AI is analyzing your resume...";

    const btn = document.querySelector("button");
    btn.disabled = true;
    btn.innerText = "Analyzing...";

    const data = {
        name: name.value,
        email: email.value,
        role: role.value,
        skills: skills.value,
        projects: projects.value,
        experience: experience.value,
        education: education.value
    };

    try {
        const res = await fetch("/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        loading.innerText = "";

        const score = result.score || 0;

        const bar = document.getElementById("scoreBar");
        bar.style.width = score + "%";

        document.getElementById("scoreText").innerText =
            score + "% Resume Strength";

        function fillList(id, items) {
            const ul = document.getElementById(id);
            ul.innerHTML = "";

            if (!items || items.length === 0) {
                ul.innerHTML = "<li>No data</li>";
                return;
            }

            items.forEach(item => {
                const li = document.createElement("li");
                li.textContent = item;
                ul.appendChild(li);
            });
        }

        fillList("strengths", result.strengths);
        fillList("weaknesses", result.weaknesses);
        fillList("missingSkills", result.missingSkills);
        fillList("suggestions", result.suggestions);

        const jobsDiv = document.getElementById("jobs");
        jobsDiv.innerHTML = "";

        result.jobs.forEach(job => {
            const card = document.createElement("div");
            card.className = "job-card";

            card.innerHTML = `
                <div class="job-top">
                    <h3>${job.title}</h3>
                    <span class="badge">Hiring</span>
                </div>

                <p class="company">${job.company}</p>
                <p class="location">${job.location}</p>

                <a href="${job.link}" target="_blank" class="apply-btn">
                    Apply →
                </a>
            `;

            jobsDiv.appendChild(card);
        });

    } catch (err) {
        loading.innerText = "❌ Something went wrong!";
    }

    btn.disabled = false;
    btn.innerText = "Analyze Resume";
});