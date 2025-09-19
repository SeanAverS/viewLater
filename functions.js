// Utility and Display Logic

// generate unique id for new links
function generateUniqueId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 10);
}

// display various success or error messages
function showMessage(message, type = "error") {
    messageDisplay.textContent = message;
    messageDisplay.classList.remove("info", "success", "error");
    messageDisplay.classList.add(type);
    messageDisplay.style.display = "block";

    setTimeout(() => {
        messageDisplay.style.display = "none";
        messageDisplay.textContent = "";
        messageDisplay.classList.remove(type); 
    }, 3000);
}

// display importing bookmark message
function showImportMessage(message, type = "info") {
    importMessage.textContent = message;
    importMessage.style.color = ""; 
    if (type === "success") {
        importMessage.style.color = "#98c379";
    } else if (type === "error") {
        importMessage.style.color = "#e06c75";
    } else {
        importMessage.style.color = "#61afef";
    }
    setTimeout(() => {
        importMessage.textContent = "";
        importMessage.style.color = ""; 
    }, 5000);
}


// Group Management 

// populate groupfilter and groupinput dropdowns
async function populateGroupDropdowns() {
    const result = await chrome.storage.local.get(["myLinks"]);
    const myLinks = result.myLinks || [];
    const groups = new Set();

    // populate valid link in group
    myLinks.forEach((link) => {
        if (link.group) {
            groups.add(link.group);
        }
    });

    const sortedGroups = Array.from(groups).sort((a, b) => a.localeCompare(b));

    // populate groupFilter dropdown
    groupFilter.innerHTML = '<option value="">Groups</option>';
    sortedGroups.forEach((group) => {
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        groupFilter.appendChild(option);
    });
    groupFilter.value = groupFilter.dataset.currentFilter || "";

    // populate groupInput dropdown
    groupInput.innerHTML = `
        <option value="">No Group</option>
        <option value="NEW_GROUP">Create New Group</option>
    `;
    sortedGroups.forEach((group) => {
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        groupInput.appendChild(option);
    }); 
}

// Link Display and Rendering 

// display saved links and groups
async function displaySavedLinks(query = "", selectedGroup = "") {
    try {
        const result = await chrome.storage.local.get(["myLinks"]);
        let myLinks = result.myLinks || [];
        
        // filter matching links
        myLinks = myLinks.filter(link =>
            typeof link === 'object' && link !== null && 'id' in link
        );

        if (selectedGroup) {
            myLinks = myLinks.filter((link) => link.group === selectedGroup);
        }

        const lowerCaseQuery = query.toLowerCase();
        if (lowerCaseQuery) {
            myLinks = myLinks.filter((link) => {
                const titleMatches = (link.title || "").toLowerCase().includes(lowerCaseQuery);
                const urlMatches = (link.url || "").toLowerCase().includes(lowerCaseQuery);
                const notesMatches = (link.notes || "").toLowerCase().includes(lowerCaseQuery);
                const groupMatches = (link.group || "").toLowerCase().includes(lowerCaseQuery);
                return titleMatches || urlMatches || notesMatches || groupMatches;
            });
        }

        myLinks.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        const linksToRender = showAllLinks
            ? myLinks
            : myLinks.slice(0, initialDisplayLimit);
        currentlyDisplayedLinks = linksToRender;
        savedLinksList.innerHTML = "";

        linksToRender.forEach((link) => {
             if (!link.id) {
                link.id = generateUniqueId();
             }

             let listItem = document.createElement("li");
             listItem.dataset.id = link.id;
             
            // Build saved link
             if (link.url) {
                 listItem.innerHTML = `
                     <a href="${link.url}" target="_blank" rel="noopener noreferrer">
                         <strong>${link.title || link.url}</strong>
                     </a>
                     <br>
                 `;
             } else {
                 listItem.innerHTML = `
                     <strong>${link.title || "Link Title Missing (URL corrupted)"}</strong>
                     <br>
                 `;
                 console.warn(`Link with ID ${link.id} has a missing or invalid URL.`);
             }

             if (link.notes) {
                 let notesPara = document.createElement("p");
                 notesPara.className = "link-notes";
                 notesPara.textContent = `Notes: ${link.notes}`;
                 listItem.appendChild(notesPara);
             }

             if (link.group) {
                 let groupPara = document.createElement("p");
                 groupPara.className = "link-group";
                 groupPara.textContent = `Group: ${link.group}`;
                 listItem.appendChild(groupPara);
             }

             let linkActionsDiv = document.createElement("div");
             linkActionsDiv.className = "link-actions";

             let editButton = document.createElement("button");
             editButton.dataset.id = link.id;
             editButton.className = "edit-btn";
             editButton.textContent = "Edit";
             editButton.setAttribute("aria-label", `Edit ${link.title || link.url}`);
             linkActionsDiv.appendChild(editButton);

             let deleteButton = document.createElement("button");
             deleteButton.dataset.id = link.id;
             deleteButton.className = "delete-btn";
             deleteButton.textContent = "Delete";
             deleteButton.setAttribute(
                 "aria-label",
                 `Delete ${link.title || link.url}`
             );
             linkActionsDiv.appendChild(deleteButton);

             listItem.appendChild(linkActionsDiv);
             savedLinksList.appendChild(listItem);
        });

        // no matching link found
        if (myLinks.length === 0) {
            const msgItem = document.createElement("li");
            msgItem.className = "no-links-message";
            msgItem.textContent = "No matching links found.";
            savedLinksList.appendChild(msgItem);
        }

        // show more / less links button
        const removeOldShowLinksButton = document.querySelector(".show-more-container");
        if (removeOldShowLinksButton) {
            removeOldShowLinksButton.remove();
        }

        if (myLinks.length > initialDisplayLimit) {
            let showLinkButtonContainer = document.createElement("div");
            showLinkButtonContainer.className = "show-more-container";

            let showLinkButton = document.createElement("button");
            showLinkButton.setAttribute('aria-controls', 'savedLinksList');
            showLinkButtonContainer.appendChild(showLinkButton);

            if (!showAllLinks) {
                showLinkButton.id = "showMoreLinks";
                showLinkButton.innerHTML = `Show All Links <span class="arrow-down"></span>`;
                showLinkButton.setAttribute('aria-expanded', 'false');
                showLinkButton.onclick = () => {
                    showAllLinks = true;
                    displaySavedLinks(searchInput.value, groupFilter.value);
                    showLinkButton.setAttribute('aria-expanded', 'true');
                };
            } else {
                showLinkButton.id = "showLessLinks";
                showLinkButton.innerHTML = `Show Less <span class="arrow-up"></span>`;
                showLinkButton.setAttribute('aria-expanded', 'true');
                showLinkButton.onclick = () => {
                    showAllLinks = false;
                    displaySavedLinks(searchInput.value, groupFilter.value);
                    showLinkButton.setAttribute('aria-expanded', 'false');
                    if (mySavedLinksSection) {
                        mySavedLinksSection.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });
                    }
                };
            }
            savedLinksList.appendChild(showLinkButtonContainer);
        }

        // re-attach buttons 
        savedLinksList.querySelectorAll(".delete-btn").forEach((button) => {
            button.removeEventListener("click", handleDeleteButtonClick);
            button.addEventListener("click", handleDeleteButtonClick);
        });
        savedLinksList.querySelectorAll(".edit-btn").forEach((button) => {
            button.removeEventListener("click", handleEditButtonClick);
            button.addEventListener("click", handleEditButtonClick);
        });

    } catch (error) {
        console.error("Error displaying saved links:", error);
        const listItem = document.createElement("li");
        listItem.textContent = "Error loading links.";
        savedLinksList.appendChild(listItem);
    }
}

// Specific Button/Action Handlers 

// delete button
async function handleDeleteButtonClick(event) {
    const idToDelete = event.target.dataset.id;
    let result = await chrome.storage.local.get(["myLinks"]);

    if (chrome.runtime.lastError) {
        console.error(
            "Error getting myLinks from storage:",
            chrome.runtime.lastError
        );
        showMessage("Error retrieving links.", "error");
        return;
    }

    // find link to delete
    let myLinks = result.myLinks || [];
    const indexToDelete = myLinks.findIndex((link) => link.id === idToDelete);

    if (indexToDelete !== -1) {
        myLinks.splice(indexToDelete, 1);
        
        await chrome.storage.local.set({ myLinks: myLinks });

        if (chrome.runtime.lastError) {
            console.error(
                "Error setting myLinks to storage:",
                chrome.runtime.lastError
            );
            showMessage("Error saving changes.", "error");
            return;
        }

        await populateGroupDropdowns();
        displaySavedLinks(searchInput.value, groupFilter.value);
        showMessage("Link deleted successfully!", "success");
    } else {
        showMessage(
            "Failed to delete link: Link not found or no change.",
            "error"
        );
    }
}

// edit button  
async function handleEditButtonClick(event) {
    const idToEdit = event.target.dataset.id; 

    const result = await chrome.storage.local.get(["myLinks"]);
    if (chrome.runtime.lastError) {
        console.error("Error getting myLinks from storage:", chrome.runtime.lastError);
        showMessage("Error retrieving links for edit.", "error");
        return;
    }

    // find link to edit 
    const myLinks = result.myLinks || [];
    editIndex = myLinks.findIndex((link) => link.id === idToEdit);
    const linkToEdit = myLinks[editIndex];

    // update edited link
    if (linkToEdit) {
        originalLinkUrl = linkToEdit.url;
        originalLinkTitle = linkToEdit.title;
        originalLinkNotes = linkToEdit.notes; 
        originalLinkGroup = linkToEdit.group;
        originalLinkSavedAt = linkToEdit.savedAt;
        originalLinkId = linkToEdit.id;

        titleInput.value = linkToEdit.title || "";
        notesInput.value = linkToEdit.notes || "";
        groupInput.value = linkToEdit.group || "";
        newGroupInput.value = "";
        newGroupInput.style.display = "none";
        newGroupInput.setAttribute('aria-hidden', 'true');

        const availableGroups = Array.from(groupInput.options).map(
            (option) => option.value
        );
        const groupExists = availableGroups.includes(linkToEdit.group);

        if (!groupExists) {
            groupInput.value = "";
        }

        saveButton.textContent = "Update Link";
        cancelEditButton.style.display = "block";

        formTitle.classList.add("fade-out");
        setTimeout(() => {
            formTitle.textContent = "Edit Current Link";
            formTitle.classList.remove("fade-out");
            formTitle.classList.add("fade-in");
            setTimeout(() => {
                formTitle.classList.remove("fade-in");
            }, 300);
        }, 300);

        document.body.scrollTop = document.documentElement.scrollTop = 0;
    } else {
        console.warn("Link to edit not found with ID:", idToEdit);
        showMessage("Failed to find link for editing.", "error");
    }
}

// display form inputs with current tab info
async function initializeFormInputs() {
    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true,
        });
        if (tab && tab.url) {
            titleInput.placeholder = tab.url;
            titleInput.value = tab.title || "";
        } else {
            titleInput.placeholder = "Could not get current URL.";
            titleInput.value = "";
        }
    } catch (error) {
        console.error("Error getting current tab info:", error);
        titleInput.placeholder = "Error getting URL.";
        titleInput.value = "";
    }
}

// reset ui in edit or save mode
async function resetFormAndUIState() {
    await initializeFormInputs();

    // clear current form inputs
    notesInput.value = "";
    groupInput.value = "";
    newGroupInput.value = "";
    newGroupInput.style.display = "none";
    newGroupInput.setAttribute('aria-hidden', 'true');
    searchInput.value = "";
    groupFilter.value = "";
    saveButton.textContent = "Save";
    cancelEditButton.style.display = "none";
    editIndex = -1; 
    originalLinkUrl = "";
    originalLinkTitle = "";
    originalLinkGroup = "";
    originalLinkSavedAt = "";
    originalLinkId = null;

    formTitle.classList.add("fade-out");
    setTimeout(() => {
        formTitle.textContent = "Save Current Page";
        formTitle.classList.remove("fade-out");
        formTitle.classList.add("fade-in");
        setTimeout(() => {
            formTitle.classList.remove("fade-in");
        }, 300);
    }, 300);

    await populateGroupDropdowns();
    showAllLinks = false;
    displaySavedLinks();
}