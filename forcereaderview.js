const ACTIVATE_READER_VIEW_COMMAND = "activate-reader-view";

let oldTabId;

/**
 * Handles the creation of a new tab by removing the old tab if it exists.
 * @param {Object} tab - The newly created tab.
 */
async function handleTabCreation(tab) {
  try {
    if (oldTabId && oldTabId !== tab.id) {
      await browser.tabs.remove(oldTabId);
    }
  } catch (error) {
    console.error(`Error removing old tab (ID: ${oldTabId}): ${error}`);
  }
}

/**
 * Activates reader view for the given tab by creating a new tab in reader mode.
 * @param {Object} tab - The tab to activate reader view for.
 */
async function ForceActivateReaderView(tab) {
  oldTabId = tab.id;
  try {
    const newTab = await browser.tabs.create({
      openInReaderMode: true,
      url: tab.url,
      index: tab.index,
      openerTabId: oldTabId
    });
    await handleTabCreation(newTab);
  } catch (error) {
    console.error(`Error creating new tab in reader mode: ${error}`);
  }
}

/**
 * Checks if the current tab is in reader view.
 * @param {number} tabId - The ID of the tab to check.
 * @returns {Promise<boolean>} - True if the tab is in reader view, false otherwise.
 */
async function isTabInReaderView(tabId) {
  try {
    const tab = await browser.tabs.get(tabId);
    return tab.isInReaderMode;
  } catch (error) {
    console.error(`Error checking Reader View status for tab (ID: ${tabId}): ${error}`);
    return false;
  }
}

/**
 * Checks if native reader mode is available for the given tab.
 * @param {number} tabId - The ID of the tab to check.
 * @returns {Promise<boolean>} - True if native reader mode is available, false otherwise.
 */
async function isNativeReaderModeAvailable(tabId) {
  try {
    const tab = await browser.tabs.get(tabId);
    const isReaderable = tab.isArticle;
    console.log(`isReaderable for tab (ID: ${tabId}):`, isReaderable); // Log the isReaderable status
    return isReaderable;
  } catch (error) {
    console.error(`Error checking native Reader Mode availability for tab (ID: ${tabId}): ${error}`);
    return false;
  }
}

/**
 * Activates native reader mode for the given tab.
 * @param {Object} tab - The tab to activate native reader mode for.
 */
async function toggleNativeReaderMode(tab) {
  try {
    await browser.tabs.toggleReaderMode(tab.id);
    console.log(`Native Reader Mode toggled for tab (ID: ${tab.id})`);
  } catch (error) {
    console.error(`Error toggling native Reader Mode for tab (ID: ${tab.id}): ${error}`);
  }
}

/**
 * Activates the appropriate reader mode for the given tab.
 * @param {Object} tab - The tab to activate reader mode for.
 */
async function toggleReaderMode(tab) {
  try {
    if (!(await isTabInReaderView(tab.id))) {
      if (await isNativeReaderModeAvailable(tab.id)) {
        await toggleNativeReaderMode(tab);
      } else {
        await ForceActivateReaderView(tab);
      }
    } else {
      console.log("Reader View is already active.");
      await toggleNativeReaderMode(tab);
    }
  } catch (error) {
    console.error(`Error activating Reader Mode for tab (ID: ${tab.id}): ${error}`);
  }
}

// Listener for browser action (e.g., toolbar button) click
browser.browserAction.onClicked.addListener(async (tab) => {
  await toggleReaderMode(tab);
});

// Listener for specific command (e.g., keyboard shortcut)
browser.commands.onCommand.addListener(async (command) => {
  if (command === ACTIVATE_READER_VIEW_COMMAND) {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        const tab = tabs[0];
        await toggleReaderMode(tab);
      }
    } catch (error) {
      console.error(`Error processing command (${command}): ${error}`);
    }
  }
});