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

  const initialDisplayLimit = 3;
  let showAllLinks = false;
  let currentlyDisplayedLinks = [];

  // Cancel edit button
  const cancelEditButton = document.createElement("button");
  cancelEditButton.id = "cancelEditButton";
  cancelEditButton.textContent = "Cancel Edit";
  cancelEditButton.style.display = "none";
  saveButton.parentNode.insertBefore(cancelEditButton, saveButton.nextSibling);

  // Function to populate groupFilter and groupInput dropdowns
  async function populateGroupDropdowns() {
    const result = await chrome.storage.local.get(["myLinks"]);
    const myLinks = result.myLinks || [];
    const groups = new Set();

    myLinks.forEach((link) => {
      if (link.group) {
        groups.add(link.group);
      }
    });
    // Sort groups alphabetically
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
        const uniqueKey = `${link.url}|${link.title}|${link.group}`;
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
        }" data-group="${link.group}" class="edit-btn">Edit</button>
                <button data-url="${link.url}" data-title="${
          link.title
        }" data-group="${link.group}" class="delete-btn">Delete</button>
            </div>
          `;
        savedLinksList.appendChild(listItem);
      });

      // No matching links message
      if (myLinks.length === 0) {
        const msgItem = document.createElement("li");
        msgItem.className = "no-links-message";
        msgItem.textContent = "No matching links found.";
        savedLinksList.appendChild(msgItem);
      }

      // "Show All Links" or "Show Less" button
      if (myLinks.length > initialDisplayLimit) {
        let showMoreLessContainer = document.createElement("div");
        showMoreLessContainer.className = "show-more-container";

        let showMoreLessButton = document.createElement("button");
        showMoreLessContainer.appendChild(showMoreLessButton);

        // Update button text and event listener
        if (!showAllLinks) {
          showMoreLessButton.id = "showMoreLinks";
          showMoreLessButton.innerHTML = `Show All Links <span class="arrow-down"></span>`;
          showMoreLessButton.onclick = () => {
            showAllLinks = true;
            displaySavedLinks(searchInput.value, groupFilter.value);
            // No scroll for "Show All Links"
          };
        } else {
          showMoreLessButton.id = "showLessLinks";
          showMoreLessButton.innerHTML = `Show Less <span class="arrow-up"></span>`;
          showMoreLessButton.onclick = () => {
            showAllLinks = false;
            displaySavedLinks(searchInput.value, groupFilter.value);
            // Scroll to "My Saved Links" section when showing less
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

      // Re-attach event listeners to delete and edit buttons

      // prevent duplicates
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

  // Handle delete button click
  async function handleDeleteButtonClick(event) {
    const currentLinks =
      (await chrome.storage.local.get(["myLinks"])).myLinks || [];
    currentLinks.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    // Find the exact link to delete
    const urlToDelete = event.target.dataset.url;
    const titleToDelete = event.target.dataset.title;
    const groupToDelete = event.target.dataset.group;

    const indexToDelete = currentLinks.findIndex(
      (link) =>
        link.url === urlToDelete &&
        link.title === titleToDelete &&
        link.group === groupToDelete
    );

    if (indexToDelete !== -1) {
      currentLinks.splice(indexToDelete, 1);
      await chrome.storage.local.set({ myLinks: currentLinks });
      await populateGroupDropdowns();
      displaySavedLinks(searchInput.value, groupFilter.value);
    }
  }

  // Event handler for edit button clicks
  async function handleEditButtonClick(event) {
    const currentLinks =
      (await chrome.storage.local.get(["myLinks"])).myLinks || [];
    currentLinks.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    const urlToEdit = event.target.dataset.url;
    const titleToEdit = event.target.dataset.title;
    const groupToEdit = event.target.dataset.group;

    editIndex = currentLinks.findIndex(
      (link) =>
        link.url === urlToEdit &&
        link.title === titleToEdit &&
        link.group === groupToEdit
    );
    const linkToEdit = currentLinks[editIndex];

    if (linkToEdit) {
      titleInput.value = linkToEdit.title || "";
      notesInput.value = linkToEdit.notes || "";
      groupInput.value = linkToEdit.group || "";
      newGroupInput.value = ""; // Clear new group input
      newGroupInput.style.display = "none";

      if (
        !Array.from(groupInput.options).some(
          (option) => option.value === linkToEdit.group
        )
      ) {
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

  // Event listener for groupInput dropdown to show/hide newGroupInput
  groupInput.addEventListener("change", () => {
    if (groupInput.value === "NEW_GROUP") {
      newGroupInput.style.display = "block";
    } else {
      newGroupInput.style.display = "none";
      newGroupInput.value = "";
    }
  });

  // Save/Update link button event listener
  saveButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const urlToSave = tab.url;
    const titleToSave = titleInput.value.trim();
    const notesToSave = notesInput.value.trim();

    // Determine link to save group to
    let groupToSave = "";
    if (groupInput.value === "NEW_GROUP") {
      groupToSave = newGroupInput.value.trim();
      if (!groupToSave) {
        alert("Please enter a name for the new group.");
        return;
      }
    } else {
      groupToSave = groupInput.value;
    }

    if (!urlToSave) {
      alert("Cannot save: Invalid URL.");
      return;
    }

    // save or edit link to local storage
    try {
      const result = await chrome.storage.local.get(["myLinks"]);
      const myLinks = result.myLinks || [];

      if (editIndex !== -1) {
        const originalLink = myLinks[editIndex];

        // prevent duplicate links
        if (originalLink) {
          const isDuplicate = myLinks.some(
            (link, idx) =>
              idx !== editIndex &&
              link.url === originalLink.url &&
              link.title === titleToSave &&
              link.group === groupToSave
          );
          if (isDuplicate) {
            alert("A link with this title and group already exists!");
            return;
          }

          originalLink.title = titleToSave;
          originalLink.notes = notesToSave;
          originalLink.group = groupToSave;
          await chrome.storage.local.set({ myLinks });
        } else {
          alert("Error: Link to update not found.");
        }
      } else {
        const isDuplicate = myLinks.some(
          (link) =>
            link.url === urlToSave &&
            link.title === titleToSave &&
            link.group === groupToSave
        );
        if (isDuplicate) {
          alert("This link with the same title and group is already saved!");
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
      notesInput.value = "";
      groupInput.value = "";
      newGroupInput.value = "";
      newGroupInput.style.display = "none";
      searchInput.value = "";
      groupFilter.value = "";
      saveButton.textContent = "Save";
      cancelEditButton.style.display = "none";
      editIndex = -1; // Reset edit index

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

      await populateGroupDropdowns(); // Refresh group options
      showAllLinks = false; // Reset to after saving/updating link
      displaySavedLinks();
    } catch (error) {
      console.error("Error saving/updating link:", error);
      alert("Failed to save/update link.");
    }
  });

  // Cancel Edit button event listener
  cancelEditButton.addEventListener("click", async () => {
    // Reset inputs and UI state
    titleInput.value = "";
    notesInput.value = "";
    groupInput.value = "";
    newGroupInput.value = "";
    newGroupInput.style.display = "none";
    saveButton.textContent = "Save";
    cancelEditButton.style.display = "none";
    editIndex = -1; // Reset edit index

    // Re-populate titleInput with current tab
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

  // search input event listener
  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      showAllLinks = false; // Reset after searching
      displaySavedLinks(searchInput.value, groupFilter.value);
    }, 300);
  });

  // group filter dropdown event listener
  groupFilter.addEventListener("change", () => {
    groupFilter.dataset.currentFilter = groupFilter.value;
    showAllLinks = false; // Reset after filtering groups
    displaySavedLinks(searchInput.value, groupFilter.value);
  });

  await populateGroupDropdowns(); // Populate groups first
  displaySavedLinks();
});
