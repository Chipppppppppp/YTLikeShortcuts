const defaultDomains = [
    "https://www.youtube.com",
    "https://m.youtube.com"
];

browser.tabs.query({ active: true, currentWindow: true })
    .then(tabs => {
        dialog.querySelector("#new-domain-input").value = new URL(tabs[0].url).origin;
    });

browser.storage.local.get("domains", result => {
    let domains = result.domains || defaultDomains.slice();

    let dialog = document.getElementById("dialog");

    dialog.querySelector("#add-domain").addEventListener("click", () => {
        const newDomainInput = dialog.querySelector("#new-domain-input").value;
        if (!newDomainInput) {
            alert("Invalid input")
        } else if (!domains.includes(newDomainInput)) {
            domains.push(newDomainInput);
            browser.storage.local.set({ domains });
            alert(`Domain added: ${newDomainInput}`);
            updateDomainList(dialog, domains);
            browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => {
                    dialog.querySelector("#new-domain-input").value = new URL(tabs[0].url).origin;
                });
        } else {
            alert(`Domain already exists: ${newDomainInput}`);
        }
    });

    dialog.querySelector("#reset-domains").addEventListener("click", () => {
        if (confirm("Are you sure you want to reset domains to default?")) {
            domains = defaultDomains.slice();
            browser.storage.local.set({ domains });
            alert("Domains have been reset to default.");
            updateDomainList(dialog, domains);
            browser.tabs.query({ active: true, currentWindow: true })
                .then(tabs => {
                    dialog.querySelector("#new-domain-input").value = new URL(tabs[0].url).origin;
                });
        }
    });

    updateDomainList(dialog, domains);

    function createDomainItemHTML(domain) {
        return `
        <div class="domain-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span>${domain}</span>
            <div>
                <button class="edit-domain" data-domain="${domain}" style="margin-right: 5px;">Edit</button>
                <button class="remove-domain" data-domain="${domain}">Remove</button>
            </div>
        </div>
    `;
    }

    function updateDomainList(dialog, domains) {
        const domainList = dialog.querySelector("#domain-list");
        domainList.innerHTML = domains.map(domain => createDomainItemHTML(domain)).join("");

        domainList.querySelectorAll(".remove-domain").forEach(button => {
            button.addEventListener("click", (event) => {
                const domainToRemove = event.target.getAttribute("data-domain");
                if (confirm(`Are you sure you want to remove ${domainToRemove}?`)) {
                    const index = domains.indexOf(domainToRemove);
                    if (index !== -1) {
                        domains.splice(index, 1);
                        browser.storage.local.set({ domains });
                        alert(`Domain removed: ${domainToRemove}`);
                    } else {
                        alert(`Domain not found: ${domainToRemove}`);
                    }
                }
                updateDomainList(dialog, domains);
            });
        });

        domainList.querySelectorAll(".edit-domain").forEach(button => {
            button.addEventListener("click", (event) => {
                const domainToEdit = event.target.getAttribute("data-domain");
                const newDomainName = prompt(`Edit domain: ${domainToEdit}`, domainToEdit);
                if (newDomainName === null) {
                    updateDomainList(dialog, domains);
                    return;
                }
                if (!newDomainName) {
                    alert("Invalid input");
                } else if (!domains.includes(newDomainName)) {
                    const index = domains.indexOf(domainToEdit);
                    if (index !== -1) {
                        domains[index] = newDomainName;
                        browser.storage.local.set({ domains });
                        alert(`Domain edited: ${domainToEdit} to ${newDomainName}`);
                    } else {
                        alert(`Domain not found: ${domainToEdit}`);
                    }
                } else {
                    alert(`Domain already exists: ${newDomainName}`);
                }
                updateDomainList(dialog, domains);
            });
        });
    }
});
