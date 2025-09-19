// Main Event Logic

// Save/Update Handlers

// save a new link or update an existing link
async function handleSaveOrUpdate() {
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
    });

    const urlToSave = editIndex === -1 ? tab.url : originalLinkUrl;
    const titleToSave = titleInput.value.trim();
    const notesToSave = notesInput.value.trim();

    // empty group input safeguard
    let groupToSave = "";
    if (groupInput.value === "NEW_GROUP") {
        groupToSave = newGroupInput.value.trim();
        if (!groupToSave) {
            showMessage("Please enter a name for the new group.", "error");
            return;
        }
    } else {
        groupToSave = groupInput.value.trim();
    }

    if (!urlToSave) {
        showMessage("Cannot save: Invalid URL.", "error");
        return;
    }

    try {
        let result = await chrome.storage.local.get(["myLinks"]);
        if (chrome.runtime.lastError) {
            console.error("Error getting myLinks from storage:", chrome.runtime.lastError);
            showMessage("Error retrieving links for save/update.", "error");
            return;
        }

        let myLinks = result.myLinks || [];

        // update an exsiting link
        if (editIndex !== -1) { 
            const updatedLink = {
                id: originalLinkId, 
                url: originalLinkUrl, 
                title: titleToSave,
                notes: notesToSave,
                group: groupToSave,
                savedAt: originalLinkSavedAt, 
            };

            const isDuplicate = myLinks.some((link) => {
                return (
                    link.id !== updatedLink.id && 
                    link.url === updatedLink.url &&
                    link.title === updatedLink.title &&
                    link.group === updatedLink.group
                );
            });

            if (isDuplicate) {
                showMessage("This link already exists!", "error");
                return;
            }

            myLinks[editIndex] = updatedLink;
            await chrome.storage.local.set({ myLinks });

            if (chrome.runtime.lastError) {
                console.error("Error setting myLinks to storage:", chrome.runtime.lastError);
                showMessage("Error saving updated link.", "error");
                return;
            }
            showMessage("Link updated successfully!", "success");
        } else { // save a new link
            const newLink = {
                id: generateUniqueId(), 
                url: urlToSave,
                title: titleToSave,
                notes: notesToSave,
                group: groupToSave,
                savedAt: new Date().toISOString(), 
            };

            // check for duplicates
            const isDuplicate = myLinks.some(
                (link) =>
                    link.url === newLink.url &&
                    link.title === newLink.title &&
                    link.group === newLink.group
            );
            if (isDuplicate) {
                showMessage("This link already exists!", "error");
                return;
            }

            myLinks.push(newLink);
            await chrome.storage.local.set({ myLinks });

            if (chrome.runtime.lastError) {
                console.error("Error setting myLinks to storage:", chrome.runtime.lastError);
                showMessage("Error saving new link.", "error");
                return;
            }
            showMessage("Link saved successfully!", "success");
        }

        await resetFormAndUIState();

    } catch (error) {
        console.error("Error saving/updating link:", error);
        showMessage("Failed to save/update link.", "error");
    }
}

// cancel an ongoing link edit
async function handleCancelEdit() {
    await resetFormAndUIState(); 
}

// input/filter handlers 

// assign a link to a new group
function handleGroupInputChange() {
    if (groupInput.value === "NEW_GROUP") {
        newGroupInput.style.display = "block";
        newGroupInput.setAttribute('aria-hidden', 'false');
    } else {
        newGroupInput.style.display = "none";
        newGroupInput.value = "";
        newGroupInput.setAttribute('aria-hidden', 'true');
    }
}

// search for groups / within groups
function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        showAllLinks = false;
        displaySavedLinks(searchInput.value, groupFilter.value);
    }, 300);
}

// display links from selected group
function handleGroupFilterChange() {
    groupFilter.dataset.currentFilter = groupFilter.value;
    showAllLinks = false;
    displaySavedLinks(searchInput.value, groupFilter.value);
}

// import handler 

// import bookmarks from local storage (chrome)
async function handleImportBookmarks() {
    // import then compare chrome and viewLater bookmarks
    showImportMessage("Importing bookmarks...", "info");
    try { 
        const bookmarkTree = await chrome.bookmarks.getTree();
        let importedCount = 0;

        let result = await chrome.storage.local.get(["myLinks"]);
        if (chrome.runtime.lastError) {
            console.error("Error getting myLinks from storage for import:", chrome.runtime.lastError);
            showMessage("Error retrieving links for import.", "error");
            showImportMessage("Failed to import bookmarks.", "error");
            return;
        }

        let myLinks = result.myLinks || [];

        const isDuplicate = (url, title, group) => {
            return myLinks.some(
                (link) =>
                    link.url === url &&
                    link.title === title &&
                    link.group === group
            );
        };

        // import chrome bookmarks into viewLater under "Imported Links"
        function processBookmarks(nodes) {
            nodes.forEach((node) => {
                if (node.url) {
                    const bookmarkTitle = node.title || node.url; 
                    const importedGroup = "Imported Links";

                    if (!isDuplicate(node.url, bookmarkTitle, importedGroup)) {
                        myLinks.push({
                            id: generateUniqueId(),
                            url: node.url,
                            title: bookmarkTitle,
                            notes: "",
                            group: importedGroup,
                            savedAt: new Date().toISOString(),
                        });
                        importedCount++;
                    }
                }
                if (node.children) {
                    processBookmarks(node.children);
                }
            });
        }

        processBookmarks(bookmarkTree);

        if (importedCount > 0) {
            await chrome.storage.local.set({ myLinks });
            if (chrome.runtime.lastError) {
                console.error("Error setting myLinks to storage after import:", chrome.runtime.lastError);
                showMessage("Error saving imported bookmarks.", "error");
                showImportMessage("Failed to import bookmarks.", "error");
                return;
            }
            showImportMessage(
                `Successfully imported ${importedCount} bookmark(s) into "Imported Links"!`,
                "success"
            );

            await populateGroupDropdowns();
            showAllLinks = false;
            displaySavedLinks();
        } else {
            showImportMessage("No new bookmarks found to import.", "info");
        }
    } catch (error) {
        console.error("Error importing bookmarks:", error);
        showMessage(
            "Failed to import bookmarks. Please ensure the 'bookmarks' permission is granted.",
            "error"
        );
        showImportMessage("Failed to import bookmarks.", "error"); 
    }
}