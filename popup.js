document.addEventListener("DOMContentLoaded", async () => {
  // This script manages the extensions popup functionality
  // It handles the following:
  // saving the current tabs URL, link title, link notes, and link groups
  // displaying the saved links, searching for saved links, deleting saved links

  const saveButton = document.getElementById("saveButton");
  const titleInput = document.getElementById("titleInput");
  const notesInput = document.getElementById("notesInput");
  const groupInput = document.getElementById("groupInput");
  const newGroupInput = document.getElementById("newGroupInput");
  const searchInput = document.getElementById("searchInput");
  const groupFilter = document.getElementById("groupFilter");
  const savedLinksList = document.getElementById("savedLinksList");
  const formTitle = document.getElementById("formTitle");
  const mySavedLinksSection = document.getElementById("mySavedLinksSection");

  let editIndex = -1;
  let originalLinkUrl = "";
  let originalLinkTitle = "";
  let originalLinkGroup = "";
  let originalLinkSavedAt = ""; 
  let originalLinkId = null;

  const initialDisplayLimit = 3;
  let showAllLinks = false;
  let currentlyDisplayedLinks = [];

  const messageDisplay = document.getElementById("messageDisplay");

  const importBookmarksButton = document.getElementById("importBookmarksButton");
  const importMessage = document.getElementById("importMessage");

  // Cancel edit button
  const cancelEditButton = document.createElement("button");
  cancelEditButton.id = "cancelEditButton";
  cancelEditButton.textContent = "Cancel Edit";
  cancelEditButton.style.display = "none";
  saveButton.parentNode.insertBefore(cancelEditButton, saveButton.nextSibling);

  // Function generate unique id's for new links
  function generateUniqueId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 10);
  }

  
  // Function to display importating bookmark message
  function showImportMessage(message, type = "info") {
    importMessage.textContent = message;
    importMessage.style.color = ""; // Reset color
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

  // Function to populate groupFilter and groupInput dropdowns
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

  // Function to display saved links and groups
  async function displaySavedLinks(query = "", selectedGroup = "") {
    try {
      const result = await chrome.storage.local.get(["myLinks"]);
      let myLinks = result.myLinks || [];

        myLinks = myLinks.filter(link =>
            typeof link === 'object' && link !== null && 'id' in link
        );

      if (selectedGroup) {
        myLinks = myLinks.filter((link) => link.group === selectedGroup);
      }

      // Apply case-insensitive search filter
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

      // Determine links to display
      const linksToRender = showAllLinks
        ? myLinks
        : myLinks.slice(0, initialDisplayLimit);
      currentlyDisplayedLinks = linksToRender;
      savedLinksList.innerHTML = "";

      // Add / Re-order appropriate links
      linksToRender.forEach((link) => {
        if (!link.id) {
          link.id = generateUniqueId();
        }

        let listItem = document.createElement("li");
        listItem.dataset.id = link.id; 

        // Create link title 
        let linkAnchor = document.createElement("a");
        // Check for invalid url 
        if (link.url) {
          linkAnchor.href = link.url;
          linkAnchor.target = "_blank";
          let strongTag = document.createElement("strong");
          strongTag.textContent = link.title || link.url;
          linkAnchor.appendChild(strongTag);
          listItem.appendChild(linkAnchor);
          listItem.appendChild(document.createElement("br"));
        } else {
          // just display title, no link
          let strongTag = document.createElement("strong");
          strongTag.textContent =
            link.title || "Link Title Missing (URL corrupted)";
          listItem.appendChild(strongTag);
          listItem.appendChild(document.createElement("br"));
          console.warn(`Link with ID ${link.id} has a missing or invalid URL.`);
        }

        // Add notes if present
        if (link.notes) {
          let notesPara = document.createElement("p");
          notesPara.className = "link-notes";
          notesPara.textContent = `Notes: ${link.notes}`;
          listItem.appendChild(notesPara);
        }

        // Add group if present
        if (link.group) {
          let groupPara = document.createElement("p");
          groupPara.className = "link-group";
          groupPara.textContent = `Group: ${link.group}`;
          listItem.appendChild(groupPara);
        }

        // edit and delete buttons
        let linkActionsDiv = document.createElement("div");
        linkActionsDiv.className = "link-actions";

        let editButton = document.createElement("button");
        editButton.dataset.id = link.id; // Pass only the unique ID
        editButton.className = "edit-btn";
        editButton.textContent = "Edit";
        editButton.setAttribute('aria-label', `Edit ${link.title || link.url}`);
        linkActionsDiv.appendChild(editButton);

        let deleteButton = document.createElement("button");
        deleteButton.dataset.id = link.id; // Pass only the unique ID
        deleteButton.className = "delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute('aria-label', `Delete ${link.title || link.url}`);
        linkActionsDiv.appendChild(deleteButton);

        listItem.appendChild(linkActionsDiv);
        savedLinksList.appendChild(listItem);
      });

      // No matching links
      if (myLinks.length === 0) {
        const msgItem = document.createElement("li");
        msgItem.className = "no-links-message";
        msgItem.textContent = "No matching links found.";
        savedLinksList.appendChild(msgItem);
      }

      // "Show All Links" or "Show Less" content
      const existingShowMoreLessContainer = document.querySelector(".show-more-container");
      if (existingShowMoreLessContainer) {
        existingShowMoreLessContainer.remove();
      }

      if (myLinks.length > initialDisplayLimit) {
        let showMoreLessContainer = document.createElement("div");
        showMoreLessContainer.className = "show-more-container";

        let showMoreLessButton = document.createElement("button");
        showMoreLessButton.setAttribute('aria-controls', 'savedLinksList');
        showMoreLessContainer.appendChild(showMoreLessButton);

        if (!showAllLinks) {
          showMoreLessButton.id = "showMoreLinks";
          showMoreLessButton.innerHTML = `Show All Links <span class="arrow-down"></span>`;
          showMoreLessButton.setAttribute('aria-expanded', 'false');
          showMoreLessButton.onclick = () => {
            showAllLinks = true;
            displaySavedLinks(searchInput.value, groupFilter.value);
            showMoreLessButton.setAttribute('aria-expanded', 'true');
          };
        } else {
          showMoreLessButton.id = "showLessLinks";
          showMoreLessButton.innerHTML = `Show Less <span class="arrow-up"></span>`;
          showMoreLessButton.setAttribute('aria-expanded', 'true');
          showMoreLessButton.onclick = () => {
            showAllLinks = false;
            displaySavedLinks(searchInput.value, groupFilter.value);
            showMoreLessButton.setAttribute('aria-expanded', 'false');
            if (mySavedLinksSection) {
              mySavedLinksSection.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }
          };
        }
        savedLinksList.appendChild(showMoreLessContainer);
      }

      // Prevent duplicate delete button
      savedLinksList.querySelectorAll(".delete-btn").forEach((button) => {
        button.removeEventListener("click", handleDeleteButtonClick);
        button.addEventListener("click", handleDeleteButtonClick);
      });

      // Prevent duplicate edit button
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

  // Function to display various UI messages
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

  // Function to handle delete button clicks
  async function handleDeleteButtonClick(event) {
    const idToDelete = event.target.dataset.id; 
    let result = await chrome.storage.local.get(["myLinks"]);
    // Check for errors after getting storage
    if (chrome.runtime.lastError) {
      console.error("Error getting myLinks from storage:", chrome.runtime.lastError);
      showMessage("Error retrieving links.", "error");
      return;
    }

    let myLinks = result.myLinks || [];

    // Filter exact link to delete
    const updatedLinks = myLinks.filter((link) => {
       return link.id !== idToDelete; 
    });

    if (updatedLinks.length < myLinks.length) { 
      await chrome.storage.local.set({ myLinks: updatedLinks });

      if (chrome.runtime.lastError) {
        console.error("Error setting myLinks to storage:", chrome.runtime.lastError);
        showMessage("Error saving changes.", "error");
        return;
      }

      await populateGroupDropdowns();
      displaySavedLinks(searchInput.value, groupFilter.value);
      showMessage("Link deleted successfully!", "success");
    } else {
      showMessage("Failed to delete link: Link not found or no change.", "error");
    }
  }

  // Function to handle edit button clicks
  async function handleEditButtonClick(event) {
    const idToEdit = event.target.dataset.id; 

    const result = await chrome.storage.local.get(["myLinks"]);
    // Check for errors after getting storage
    if (chrome.runtime.lastError) {
      console.error("Error getting myLinks from storage:", chrome.runtime.lastError);
      showMessage("Error retrieving links for edit.", "error");
      return;
    }

    const myLinks = result.myLinks || [];

    // Find the link by its unique ID
    editIndex = myLinks.findIndex((link) => link.id === idToEdit);
    const linkToEdit = myLinks[editIndex];

    if (linkToEdit) {
      // Store original link to compare later
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

      // Reset group input if link group isn't in dropdown
      if (
        !Array.from(groupInput.options).some(
          (option) => option.value === linkToEdit.group
        )
      ) {
        groupInput.value = "";
      }

      // Edit link form
      saveButton.textContent = "Update Link";
      cancelEditButton.style.display = "block";

      // Animate form title change
      formTitle.classList.add("fade-out");
      setTimeout(() => {
        formTitle.textContent = "Edit Current Link";
        formTitle.classList.remove("fade-out");
        formTitle.classList.add("fade-in");
        setTimeout(() => {
          formTitle.classList.remove("fade-in");
        }, 300);
      }, 300);

      // Scroll to the top of the popup
      document.body.scrollTop = document.documentElement.scrollTop = 0;
    } else {
      console.warn("Link to edit not found with ID:", idToEdit);
      showMessage("Failed to find link for editing.", "error");
    }
  }

  // Set link title and placeholder to current tab
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

  // Show or Hide new group input
  groupInput.addEventListener("change", () => {
    if (groupInput.value === "NEW_GROUP") {
      newGroupInput.style.display = "block";
      newGroupInput.setAttribute('aria-hidden', 'false');
    } else {
      newGroupInput.style.display = "none";
      newGroupInput.value = "";
      newGroupInput.setAttribute('aria-hidden', 'true');
    }
  });

  // Save or Update link
  saveButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const urlToSave = editIndex === -1 ? tab.url : originalLinkUrl;
    const titleToSave = titleInput.value.trim();
    const notesToSave = notesInput.value.trim();

    // Determine link to save group to
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

      if (editIndex !== -1) {
        const updatedLink = {
          id: originalLinkId, 
          url: originalLinkUrl, 
          title: titleToSave,
          notes: notesToSave,
          group: groupToSave,
          savedAt: originalLinkSavedAt, 
        };

        // Check for duplicates 
        const isDuplicate = myLinks.some((link) => {
          return (
            link.id !== updatedLink.id && // Exclude current link being edited
            link.url === updatedLink.url &&
            link.title === updatedLink.title &&
            link.group === updatedLink.group
          );
        });

        if (isDuplicate) {
          showMessage("This link already exists!", "error");
          return;
        }

        // Update the link at the found index
        myLinks[editIndex] = updatedLink;
        await chrome.storage.local.set({ myLinks });

        if (chrome.runtime.lastError) {
          console.error("Error setting myLinks to storage:", chrome.runtime.lastError);
          showMessage("Error saving updated link.", "error");
          return;
        }
        showMessage("Link updated successfully!", "success");
      } else {

        const newLink = {
          id: generateUniqueId(), 
          url: urlToSave,
          title: titleToSave,
          notes: notesToSave,
          group: groupToSave,
          savedAt: new Date().toISOString(), 
        };

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

        // Check for errors after setting storage
        if (chrome.runtime.lastError) {
          console.error("Error setting myLinks to storage:", chrome.runtime.lastError);
          showMessage("Error saving new link.", "error");
          return;
        }
        console.log("Link saved successfully:", newLink);
        showMessage("Link saved successfully!", "success");
      }

      // Reset inputs for next save
      titleInput.value = tab && tab.title ? tab.title : "";
      notesInput.value = "";
      groupInput.value = "";
      newGroupInput.value = "";
      newGroupInput.style.display = "none";
      newGroupInput.setAttribute('aria-hidden', 'true');
      searchInput.value = "";
      groupFilter.value = "";
      saveButton.textContent = "Save";
      cancelEditButton.style.display = "none";
      editIndex = -1; // Reset edit index
      originalLinkUrl = "";
      originalLinkTitle = "";
      originalLinkGroup = "";
      originalLinkSavedAt = "";
      originalLinkId = null;

      // Reset form title transition
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
    } catch (error) {
      console.error("Error saving/updating link:", error);
      showMessage("Failed to save/update link.", "error");
    }
  });

  // Cancel Edit button event listener
  cancelEditButton.addEventListener("click", async () => {
    // Reset inputs and UI state
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

    notesInput.value = "";
    groupInput.value = "";
    newGroupInput.value = "";
    newGroupInput.style.display = "none";
    newGroupInput.setAttribute('aria-hidden', 'true');
    saveButton.textContent = "Save";
    cancelEditButton.style.display = "none";
    editIndex = -1;
    originalLinkUrl = "";
    originalLinkTitle = "";
    originalLinkGroup = "";
    originalLinkSavedAt = "";
    originalLinkId = null; 

    // Reset form title transition
    formTitle.classList.add("fade-out");
    setTimeout(() => {
      formTitle.textContent = "Save Current Page";
      formTitle.classList.remove("fade-out");
      formTitle.classList.add("fade-in");
      setTimeout(() => {
        formTitle.classList.remove("fade-in");
      }, 300);
    }, 300);

    showAllLinks = false; // Reset after canceling edit
    searchInput.value = ""; 
    groupFilter.value = ""; 
    displaySavedLinks();
  });

  // Search input
  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      showAllLinks = false;
      displaySavedLinks(searchInput.value, groupFilter.value);
    }, 300);
  });

  // Group filter dropdown
  groupFilter.addEventListener("change", () => {
    groupFilter.dataset.currentFilter = groupFilter.value;
    showAllLinks = false; // Reset after filtering groups
    displaySavedLinks(searchInput.value, groupFilter.value);
  });

  // Bookmark import functionality
  if (importBookmarksButton) {
    importBookmarksButton.addEventListener("click", async () => {
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

        // process bookmark nodes
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
    });
  }

  await populateGroupDropdowns();
  displaySavedLinks();
});
