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
  let editIndex = -1; 

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

    myLinks.forEach(link => {
      if (link.group) {
        groups.add(link.group);
      }
    });

    groupFilter.innerHTML = '<option value="">All Groups</option>';
    
    // Sort groups alphabetically
    const sortedGroups = Array.from(groups).sort((a, b) => a.localeCompare(b));

        // populate groupFilter dropdown
        groupFilter.innerHTML = '<option value="">All Groups</option>';
        sortedGroups.forEach(group => {
            const option = document.createElement("option");
            option.value = group;
            option.textContent = group;
            groupFilter.appendChild(option);
        });
        groupFilter.value = groupFilter.dataset.currentFilter || "";

        // populate groupInput dropdown 
        groupInput.innerHTML = `
            <option value="">(No Group)</option>
            <option value="NEW_GROUP">Create New Group</option>
        `;
        sortedGroups.forEach(group => {
            const option = document.createElement("option");
            option.value = group;
            option.textContent = group;
            groupInput.appendChild(option);
        });
    }

  // Function to display saved links and groups 
  async function displaySavedLinks(query = "", selectedGroup = "") {
    savedLinksList.innerHTML = ""; 
    try {
      const result = await chrome.storage.local.get(["myLinks"]);
      let myLinks = result.myLinks || [];

      // Filter by selected group first
      if (selectedGroup) {
        myLinks = myLinks.filter(link => link.group === selectedGroup);
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

      // check link population
      if (myLinks.length === 0) {
        const listItem = document.createElement("li");
        listItem.textContent = "No matching links found.";
        savedLinksList.appendChild(listItem);
        return;
      } else {
        myLinks.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        myLinks.forEach((link, index) => {
          const listItem = document.createElement("li");
        // HTML for link, link notes, and link groups
        listItem.innerHTML = `
          <a href="${link.url}" target="_blank"><strong>${
          link.title || link.url
        }</strong></a><br>
            ${
              link.notes ? `<p class="link-notes">Notes: ${link.notes}</p>` : ""
            }
            <div class="link-actions">
                <button data-index="${index}" class="edit-btn">Edit</button>
                <button data-index="${index}" class="delete-btn">Delete</button>
            </div>
          `;
          savedLinksList.appendChild(listItem);
        });

        // Delete link button event listener
        savedLinksList.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", async (event) => {
            const currentLinks =
              (await chrome.storage.local.get(["myLinks"])).myLinks || [];
            currentLinks.sort(
              (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
            );

            const indexToDelete = parseInt(event.target.dataset.index);
            if (indexToDelete >= 0 && indexToDelete < currentLinks.length) {
            currentLinks.splice(indexToDelete, 1);
            await chrome.storage.local.set({ myLinks: currentLinks });
            await populateGroupDropdowns(); // delete group if currently empty
            displaySavedLinks(searchInput.value, groupFilter.value); // fresh list after delete
          }
          });
        });

        // Edit link button event listener
        savedLinksList.querySelectorAll(".edit-btn").forEach((button) => {
          button.addEventListener("click", async (event) => {
            const currentLinks =
              (await chrome.storage.local.get(["myLinks"])).myLinks || [];
            currentLinks.sort(
              (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
            );

            editIndex = parseInt(event.target.dataset.index);
            const linkToEdit = currentLinks[editIndex];

            if (linkToEdit) {
              titleInput.value = linkToEdit.title || "";
              notesInput.value = linkToEdit.notes || "";
              groupInput.value = linkToEdit.group || "";
              newGroupInput.value = ""; // Clear new group input
              newGroupInput.style.display = "none";

              saveButton.textContent = "Update Link";
              cancelEditButton.style.display = "block";
             
              // Scroll to edit link section
              document.body.scrollTop = document.documentElement.scrollTop = 0;
            }
          });
        });
      }
    } catch (error) {
      console.error("Error displaying saved links:", error);
      const listItem = document.createElement("li");
      listItem.textContent = "Error loading links.";
      savedLinksList.appendChild(listItem);
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
      titleInput.value = tab.title || '';
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
        const originalLink = myLinks.sort((a,b) => new Date(b.savedAt) - new Date(a.savedAt))[editIndex];

        // prevent duplicate links
        if (originalLink) {
            const isDuplicate = myLinks.some((link, idx) =>
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
            alert("Link updated successfully!");
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
        alert("Link saved successfully!");
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

      await populateGroupDropdowns(); // Refresh group options
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
  });

  // search input event listener
  let searchTimeout;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      displaySavedLinks(searchInput.value, groupFilter.value);
    }, 300); 
  });

  // group filter dropdown event listener
  groupFilter.addEventListener("change", () => {
    groupFilter.dataset.currentFilter = groupFilter.value; 
    displaySavedLinks(searchInput.value, groupFilter.value); 
  });

    await populateGroupDropdowns(); // Populate groups first
    displaySavedLinks();
});
