document.addEventListener("DOMContentLoaded", async () => {
  // This script manages the extensions popup functionality
  // It handles the following:
  // saving the current tabs URL, link title, link notes, and link groups
  // displaying the saved links, searching for saved links, deleting saved links

  const saveButton = document.getElementById("saveButton");
  const titleInput = document.getElementById("titleInput");
  const notesInput = document.getElementById("notesInput");
  const groupInput = document.getElementById("groupInput");
  const searchInput = document.getElementById("searchInput");
  const groupFilter = document.getElementById("groupFilter"); 

  const savedLinksList = document.createElement("ul");
  document.body.appendChild(savedLinksList);

  // Function to populate group filter dropdown
  async function populateGroupFilter() {
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

    sortedGroups.forEach(group => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      groupFilter.appendChild(option);
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
          ${
            link.group ? `<p class="link-group">Group: ${link.group}</p>` : "" 
          }
            <button data-index="${index}" class="delete-btn">Delete</button>
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
            await populateGroupFilter(); // delete group if currently empty
            displaySavedLinks(searchInput.value, groupFilter.value); // fresh list after delete
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

  // Save link button event listener
  saveButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const urlToSave = tab.url;
    const titleToSave = titleInput.value.trim();
    const notesToSave = notesInput.value.trim();
    const groupToSave = groupInput.value.trim(); 

    if (!urlToSave) {
      alert("Cannot save: Invalid URL.");
      return;
    }

    // save link to local storage
    try {
      const result = await chrome.storage.local.get(["myLinks"]);
      const myLinks = result.myLinks || [];

      // prevent duplicate saves
      const isDuplicate = myLinks.some(
        (link) => link.url === urlToSave && link.title === titleToSave && link.group === groupToSave
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

      // Reset inputs for next save
      notesInput.value = "";
      groupInput.value = ""; 
      titleInput.value = "";
      searchInput.value = "";
      groupFilter.value = ""; 

      await populateGroupFilter(); // Refresh group options
      displaySavedLinks();
    } catch (error) {
      console.error("Error saving link:", error);
      alert("Failed to save link.");
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

  await populateGroupFilter(); // Populate groups first
  displaySavedLinks();
});
