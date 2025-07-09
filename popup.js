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

  function showImportMessage(message, type = "info") {
    importMessage.textContent = message;
    if (type === "success") {
      importMessage.style.color = "#98c379";
    } else if (type === "error") {
      importMessage.style.color = "#e06c75";
    } else {
      importMessage.style.color = "#61afef";
    }
    setTimeout(() => {
        importMessage.textContent = "";
        importMessage.style.color = "#61afef";
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

      // Filter by selected group first
      if (selectedGroup) {
        myLinks = myLinks.filter((link) => link.group === selectedGroup);
      }

      // case insensitive search bar
      const toLowerCase = query.toLowerCase();
      if (toLowerCase) {
        myLinks = myLinks.filter((link) => {
          const titleMatches = link.title.toLowerCase().includes(toLowerCase);
          const urlMatches = link.url.toLowerCase().includes(toLowerCase);
          const notesMatches = link.notes
            ? link.notes.toLowerCase().includes(toLowerCase)
            : false;
          const groupMatches = link.group
            ? link.group.toLowerCase().includes(toLowerCase)
            : false;
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
      linksToRender.forEach((link, index) => {
        const uniqueKey = `${link.url}|${link.title}|${link.group}|${link.savedAt}`;
        let listItem = document.createElement("li");
        listItem.dataset.key = uniqueKey;
        listItem.innerHTML = `
          <a href="${link.url}" target="_blank"><strong>${
          link.title || link.url
        }</strong></a><br>
            ${
              link.notes ? `<p class="link-notes">Notes: ${link.notes}</p>` : ""
            }
            ${
              link.group ? `<p class="link-group">Group: ${link.group}</p>` : ""
            }
            <div class="link-actions">
                <button data-url="${link.url}" data-title="${
          link.title
        }" data-group="${link.group}" data-savedat="${
          link.savedAt
        }" class="edit-btn">Edit</button>
                <button data-url="${link.url}" data-title="${
          link.title
        }" data-group="${link.group}" data-savedat="${
          link.savedAt
        }" class="delete-btn">Delete</button>
            </div>
          `;
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
        showMoreLessContainer.appendChild(showMoreLessButton);

        if (!showAllLinks) {
          showMoreLessButton.id = "showMoreLinks";
          showMoreLessButton.innerHTML = `Show All Links <span class="arrow-down"></span>`;
          showMoreLessButton.onclick = () => {
            showAllLinks = true;
            displaySavedLinks(searchInput.value, groupFilter.value);
          };
        } else {
          showMoreLessButton.id = "showLessLinks";
          showMoreLessButton.innerHTML = `Show Less <span class="arrow-up"></span>`;
          showMoreLessButton.onclick = () => {
            showAllLinks = false;
            displaySavedLinks(searchInput.value, groupFilter.value);
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
    messageDisplay.className = `message-display ${type}`;
    messageDisplay.style.display = "block";

    setTimeout(() => {
      messageDisplay.style.display = "none";
      messageDisplay.textContent = "";
      messageDisplay.className = "message-display";
    }, 3000);
  }

  // Function to handle delete button clicks
  async function handleDeleteButtonClick(event) {
    const urlToDelete = event.target.dataset.url;
    const titleToDelete = event.target.dataset.title;
    const groupToDelete = event.target.dataset.group;
    const savedAtToDelete = event.target.dataset.savedat;

    let result = await chrome.storage.local.get(["myLinks"]);
    let myLinks = result.myLinks || [];

    // Find exact link to delete
    const matchedLink = myLinks.filter(
      (link) =>
        !(
          link.url === urlToDelete &&
          link.title === titleToDelete &&
          link.group === groupToDelete &&
          link.savedAt === savedAtToDelete
        )
    );

    // Delete exact link
    if (matchedLink.length < myLinks.length) {
      await chrome.storage.local.set({ myLinks: matchedLink });
      await populateGroupDropdowns();
      displaySavedLinks(searchInput.value, groupFilter.value);
    }
  }

  // Function to handle edit button clicks
  async function handleEditButtonClick(event) {
    const urlToEdit = event.target.dataset.url;
    const titleToEdit = event.target.dataset.title;
    const groupToEdit = event.target.dataset.group;
    const savedAtToEdit = event.target.dataset.savedat;

    const result = await chrome.storage.local.get(["myLinks"]);
    const myLinks = result.myLinks || [];

    // Find exact link to edit
    editIndex = myLinks.findIndex(
      (link) =>
        link.url === urlToEdit &&
        link.title === titleToEdit &&
        link.group === groupToEdit &&
        link.savedAt === savedAtToEdit
    );
    const linkToEdit = myLinks[editIndex];

    if (linkToEdit) {
      // Store original link to compare later
      originalLinkUrl = linkToEdit.url;
      originalLinkTitle = linkToEdit.title;
      originalLinkGroup = linkToEdit.group;
      originalLinkSavedAt = linkToEdit.savedAt;

      titleInput.value = linkToEdit.title || "";
      notesInput.value = linkToEdit.notes || "";
      groupInput.value = linkToEdit.group || "";
      newGroupInput.value = "";
      newGroupInput.style.display = "none";

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
    }
  }

  // Set link title and placeholder to current tab
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.url && tab.title) {
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
    } else {
      newGroupInput.style.display = "none";
      newGroupInput.value = "";
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
      groupToSave = groupInput.value;
    }

    if (!urlToSave) {
      showMessage("Cannot save: Invalid URL.", "error");
      return;
    }

    // Save or Edit link to local storage
    try {
      let result = await chrome.storage.local.get(["myLinks"]);
      let myLinks = result.myLinks || [];

      if (editIndex !== -1) {
        // Remove unedited duplicate link
        const updatedLink = {
          url: originalLinkUrl,
          title: titleToSave,
          notes: notesToSave,
          group: groupToSave,
          savedAt: originalLinkSavedAt,
        };

        // Check for duplicates 
        const isDuplicate = myLinks.some((link, index) => {
            return (
                index !== editIndex &&
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

      } else {
        const isDuplicate = myLinks.some(
          (link) =>
            link.url === urlToSave &&
            link.title === titleToSave &&
            link.group === groupToSave
        );
        if (isDuplicate) {
          showMessage("This link already exists!", "error");
          return;
        }

        myLinks.push({
          url: urlToSave,
          title: titleToSave,
          notes: notesToSave,
          group: groupToSave,
          savedAt: new Date().toISOString(), // for sorting by new
        });

        await chrome.storage.local.set({ myLinks });
        console.log("Link saved successfully:", {
          url: urlToSave,
          title: titleToSave,
          notes: notesToSave,
          group: groupToSave,
        });
      }

      // Reset inputs for next save
      titleInput.value = tab && tab.title ? tab.title : "";
      notesInput.value = "";
      groupInput.value = "";
      newGroupInput.value = "";
      newGroupInput.style.display = "none";
      searchInput.value = "";
      groupFilter.value = "";
      saveButton.textContent = "Save";
      cancelEditButton.style.display = "none";
      editIndex = -1; // Reset edit index
      originalLinkUrl = "";
      originalLinkTitle = "";
      originalLinkGroup = "";
      originalLinkSavedAt = "";

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
      if (tab && tab.url && tab.title) {
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
    saveButton.textContent = "Save";
    cancelEditButton.style.display = "none";
    editIndex = -1;
    originalLinkUrl = "";
    originalLinkTitle = "";
    originalLinkGroup = "";
    originalLinkSavedAt = "";

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

  if (importBookmarksButton) {
    importBookmarksButton.addEventListener("click", async () => {
      showImportMessage("Importing bookmarks...", "info");
      try {
        const bookmarkTree = await chrome.bookmarks.getTree();
        let importedCount = 0;

        let result = await chrome.storage.local.get(["myLinks"]);
        let myLinks = result.myLinks || [];

        const isDuplicate = (url, title, group) => {
          return myLinks.some(link =>
            link.url === url &&
            link.title === title &&
            link.group === group
          );
        };

        function processBookmarks(nodes) {
          nodes.forEach(node => {
            if (node.url) {
              const bookmarkTitle = node.title || node.url;
              const importedGroup = "Imported Links";

              if (!isDuplicate(node.url, bookmarkTitle, importedGroup)) {
                myLinks.push({
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
          showImportMessage(`Successfully imported ${importedCount} bookmark(s) into "Imported Links"!`, "success");

          await populateGroupDropdowns();
          showAllLinks = false;
          displaySavedLinks();

        } else {
          showImportMessage("No new bookmarks found to import.", "info");
        }

      } catch (error) {
        console.error("Error importing bookmarks:", error);
        showMessage("Failed to import bookmarks. Please ensure the 'bookmarks' permission is granted.", "error");
        showImportMessage("Failed to import bookmarks.", "error");
      }
    });
  }

  await populateGroupDropdowns();
  displaySavedLinks();
});
