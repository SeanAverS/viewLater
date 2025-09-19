// The Main Control Script (Handles Initialization and Listener Attachment)

// gloval variables
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
const messageDisplay = document.getElementById("messageDisplay");
const importBookmarksButton = document.getElementById("importBookmarksButton");
const importMessage = document.getElementById("importMessage");

// global shared variables 
let editIndex = -1;
let originalLinkUrl = "";
let originalLinkTitle = "";
let originalLinkNotes = ""; 
let originalLinkGroup = "";
let originalLinkSavedAt = ""; 
let originalLinkId = null;

const initialDisplayLimit = 3;
let showAllLinks = false;
let currentlyDisplayedLinks = [];
let searchTimeout; 

// cancel edit button
const cancelEditButton = document.createElement("button");
cancelEditButton.id = "cancelEditButton";
cancelEditButton.textContent = "Cancel Edit";
cancelEditButton.style.display = "none";
if (saveButton) {
    saveButton.parentNode.insertBefore(cancelEditButton, saveButton.nextSibling);
}


// initialization and event/import listener(s)  
document.addEventListener("DOMContentLoaded", async () => {
    // intial display 
    await initializeFormInputs();
    await populateGroupDropdowns();
    await displaySavedLinks();

    // event listeners
    saveButton.addEventListener("click", handleSaveOrUpdate);
    cancelEditButton.addEventListener("click", handleCancelEdit);
    groupInput.addEventListener("change", handleGroupInputChange);
    searchInput.addEventListener("input", handleSearchInput);
    groupFilter.addEventListener("change", handleGroupFilterChange);

    // import listener
    if (importBookmarksButton) {
        importBookmarksButton.addEventListener("click", handleImportBookmarks);
    }
});