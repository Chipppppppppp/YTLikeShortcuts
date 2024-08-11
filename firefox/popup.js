const defaultPatterns = [
    "https://www.youtube.com/*",
    "https://www.nicovideo.jp/*"
];

browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
        dialog.querySelector("#new-pattern-input").value = new URL(tabs[0].url).origin + "/*";
    });

browser.storage.local.get("patterns", result => {
    let patterns = result.patterns || defaultPatterns.slice();

    let dialog = document.getElementById("dialog");

    dialog.querySelector("#add-pattern").addEventListener("click", () => {
        const newPatternInput = dialog.querySelector("#new-pattern-input").value;
        if (!newPatternInput) {
            alert("Invalid input")
        } else if (!patterns.includes(newPatternInput)) {
            patterns.push(newPatternInput);
            browser.storage.local.set({ patterns });
            alert(`URL pattern added: ${newPatternInput}`);
            updatePatternList(dialog, patterns);
            browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => {
                    dialog.querySelector("#new-pattern-input").value = new URL(tabs[0].url).origin + "/*";
                });
        } else {
            alert(`URL pattern already exists: ${newPatternInput}`);
        }
    });

    dialog.querySelector("#reset-patterns").addEventListener("click", () => {
        if (confirm("Are you sure you want to reset URL patterns to default?")) {
            patterns = defaultPatterns.slice();
            browser.storage.local.set({ patterns });
            alert("URL patterns have been reset to default.");
            updatePatternList(dialog, patterns);
            browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => {
                    dialog.querySelector("#new-pattern-input").value = new URL(tabs[0].url).origin + "/*";
                });
        }
    });

    updatePatternList(dialog, patterns);

    function createPatternItemHTML(pattern) {
        return `
        <div class="pattern-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span>${pattern}</span>
            <div>
                <button class="edit-pattern" data-pattern="${pattern}" style="margin-right: 5px;">Edit</button>
                <button class="remove-pattern" data-pattern="${pattern}">Remove</button>
            </div>
        </div>
    `;
    }

    function updatePatternList(dialog, patterns) {
        const patternList = dialog.querySelector("#pattern-list");
        patternList.innerHTML = patterns.map(pattern => createPatternItemHTML(pattern)).join("");

        patternList.querySelectorAll(".remove-pattern").forEach(button => {
            button.addEventListener("click", (event) => {
                const patternToRemove = event.target.getAttribute("data-pattern");
                if (confirm(`Are you sure you want to remove ${patternToRemove}?`)) {
                    const index = patterns.indexOf(patternToRemove);
                    if (index !== -1) {
                        patterns.splice(index, 1);
                        browser.storage.local.set({ patterns });
                        alert(`URL pattern removed: ${patternToRemove}`);
                    } else {
                        alert(`URL pattern not found: ${patternToRemove}`);
                    }
                }
                updatePatternList(dialog, patterns);
            });
        });

        patternList.querySelectorAll(".edit-pattern").forEach(button => {
            button.addEventListener("click", (event) => {
                const patternToEdit = event.target.getAttribute("data-pattern");
                const newPatternName = prompt(`Edit URL pattern: ${patternToEdit}`, patternToEdit);
                if (newPatternName === null) {
                    updatePatternList(dialog, patterns);
                    return;
                }
                if (!newPatternName) {
                    alert("Invalid input");
                } else if (!patterns.includes(newPatternName)) {
                    const index = patterns.indexOf(patternToEdit);
                    if (index !== -1) {
                        patterns[index] = newPatternName;
                        browser.storage.local.set({ patterns });
                        alert(`URL pattern edited: ${patternToEdit} to ${newPatternName}`);
                    } else {
                        alert(`URL pattern not found: ${patternToEdit}`);
                    }
                } else {
                    alert(`URL pattern already exists: ${newPatternName}`);
                }
                updatePatternList(dialog, patterns);
            });
        });
    }
});
