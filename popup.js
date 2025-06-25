document.addEventListener("DOMContentLoaded", async () => {
  // This script manages the extensions popup functionality
  // It handles the following:
  // saving the current tabs URL, link title, link notes
  // displaying the saved links, searching for saved links, deleting saved links

  const saveButton = document.getElementById("saveButton");
  const titleInput = document.getElementById("titleInput");
  const notesInput = document.getElementById("notesInput");
  const searchInput = document.getElementById("searchInput");

  const savedLinksList = document.createElement("ul");
  document.body.appendChild(savedLinksList);

  // Function to display saved links
  async function displaySavedLinks(query = "") {
    savedLinksList.innerHTML = "";
    try {
      const result = await chrome.storage.local.get(["myLinks"]);
      let myLinks = result.myLinks || [];

      // case insensitive search bar
      const toLowerCase = query.toLowerCase();
      if (toLowerCase) {
        myLinks = myLinks.filter((link) => {
          const titleMatches = link.title.toLowerCase().includes(toLowerCase);
          const urlMatches = link.url.toLowerCase().includes(toLowerCase);
          const notesMatches = link.notes
            ? link.notes.toLowerCase().includes(toLowerCase)
            : false;
          return titleMatches || urlMatches || notesMatches;
        });
      }

      // check link population
      if (myLinks.length === 0) {
        const listItem = document.createElement("li");
        listItem.textContent = "No links saved yet.";
        savedLinksList.appendChild(listItem);
      } else {
        myLinks.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        myLinks.forEach((link, index) => {
          const listItem = document.createElement("li");
          // HTML for link and link notes
          listItem.innerHTML = `
            <a href="${link.url}" target="_blank"><strong>${
            link.title
          }</strong></a><br>
            ${
              link.notes ? `<p class="link-notes">Notes: ${link.notes}</p>` : ""
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
              displaySavedLinks(); // fresh list after delete
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
      titleInput.value = tab.title;
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
        (link) => link.url === urlToSave && link.title === titleToSave
      );
      if (isDuplicate) {
        alert("This link is already saved!");
        return;
      }

      myLinks.push({
        url: urlToSave,
        title: titleToSave,
        notes: notesToSave,
        savedAt: new Date().toISOString(), // for sorting by new
      });

      await chrome.storage.local.set({ myLinks });

      console.log("Link saved successfully:", {
        url: urlToSave,
        title: titleToSave,
        notes: notesToSave,
      });
      alert("Link saved successfully!");

      notesInput.value = "";
      titleInput.value = "";

      // set title to current tab
      try {
        const [tabAfterSave] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabAfterSave && tabAfterSave.url && tabAfterSave.title) {
          titleInput.placeholder = tabAfterSave.url;
          titleInput.value = tabAfterSave.title;
        } else {
          titleInput.placeholder = "Could not get current URL.";
          titleInput.value = "";
        }
      } catch (error) {
        console.error("Error re-populating title info after save:", error);
        titleInput.placeholder = "Error getting URL.";
        titleInput.value = "";
      }

      // show newly added link
      displaySavedLinks();
    } catch (error) {
      console.error("Error saving link:", error);
      alert("Failed to save link.");
    }
  });

  // search input event listener
  searchInput.addEventListener("input", () => {
    displaySavedLinks(searchInput.value); // Re-display links based on search input 
  });

  displaySavedLinks();
});
