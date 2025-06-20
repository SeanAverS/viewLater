document.addEventListener('DOMContentLoaded', async () => {
  const saveButton = document.getElementById('saveButton');
  const currentUrlElement = document.getElementById('currentUrl');
  const currentTitleElement = document.getElementById('currentTitle');

  // Get the current tab's URL and title
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.title) {
      currentUrlElement.textContent = tab.url;
      currentTitleElement.textContent = tab.title;
    } else {
      currentUrlElement.textContent = "Could not get current URL.";
      currentTitleElement.textContent = "Could not get current title.";
    }
  } catch (error) {
    console.error("Error getting current tab info:", error);
    currentUrlElement.textContent = "Error getting URL.";
    currentTitleElement.textContent = "Error getting title.";
  }

  // Add event listener for the save button (for future implementation)
  saveButton.addEventListener('click', () => {
    const urlToSave = currentUrlElement.textContent;
    const titleToSave = currentTitleElement.textContent;
    console.log("Attempting to save:", { url: urlToSave, title: titleToSave });
    alert(`Would save:\nURL: ${urlToSave}\nTitle: ${titleToSave}`);
    // mongoDB 
  });
});