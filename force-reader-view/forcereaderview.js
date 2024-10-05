const ACTIVATE_READER_VIEW_COMMAND = "activate-reader-view";

// Constants for logging
const LOG_MESSAGES = {
  toggleOff: "Reader View is active, toggling it off.",
  toggleOn: "Activating native Reader Mode.",
  forcingReaderMode: "Forcing Reader Mode by creating a new tab.",
  readerNotAvailable: "Native Reader Mode not available, forcing Reader Mode.",
};

/**
 * Handles the creation of a new tab by removing the old tab if it exists.
 * @param {Object} newTab - The newly created tab.
 * @param {number} oldTabId - ID of the old tab to be removed.
 */
async function handleTabCreation(newTab, oldTabId) {
  if (oldTabId && oldTabId !== newTab.id) {
    try {
      await browser.tabs.remove(oldTabId);
    } catch (error) {
      console.warn(`Could not remove old tab (ID: ${oldTabId}):`, error);
    }
  }
}

/**
 * Forces reader mode by creating a new tab in reader mode.
 * @param {Object} tab - The tab to activate reader view for.
 */
async function forceActivateReaderView(tab) {
  try {
    const newTab = await browser.tabs.create({
      openInReaderMode: true,
      url: tab.url,
      index: tab.index,
      openerTabId: tab.id,
    });
    await handleTabCreation(newTab, tab.id);
  } catch (error) {
    console.error("Error creating new tab in reader mode:", error);
  }
}

/**
 * Checks if the given tab is already in reader view.
 * @param {number} tabId - The ID of the tab to check.
 * @returns {Promise<boolean>} - True if the tab is in reader mode.
 */
async function isTabInReaderView(tabId) {
  try {
    const tab = await browser.tabs.get(tabId);
    return tab?.isInReaderMode || false;
  } catch (error) {
    console.error(`Error checking Reader View status for tab (ID: ${tabId}):`, error);
    return false;
  }
}

/**
 * Checks if native reader mode is available for the given tab.
 * @param {number} tabId - The ID of the tab to check.
 * @returns {Promise<boolean>} - True if native reader mode is available.
 */
async function isNativeReaderModeAvailable(tabId) {
  try {
    const tab = await browser.tabs.get(tabId);
    return tab?.isArticle || false;
  } catch (error) {
    console.error(`Error checking native Reader Mode availability for tab (ID: ${tabId}):`, error);
    return false;
  }
}

/**
 * Toggles native reader mode for the given tab.
 * @param {Object} tab - The tab to toggle native reader mode for.
 */
async function toggleNativeReaderMode(tab) {
  try {
    await browser.tabs.toggleReaderMode(tab.id);
  } catch (error) {
    console.error(`Error toggling native Reader Mode for tab (ID: ${tab.id}):`, error);
  }
}

/**
 * Activates or toggles reader mode for the given tab.
 * If native reader mode is not available, it forces reader mode by opening a new tab.
 * @param {Object} tab - The tab to toggle reader mode for.
 */
async function toggleReaderMode(tab) {
  try {
    const isInReaderView = await isTabInReaderView(tab.id);
    if (isInReaderView) {
      console.log(LOG_MESSAGES.toggleOff);
      await toggleNativeReaderMode(tab); // Toggling off
    } else {
      const isReaderModeAvailable = await isNativeReaderModeAvailable(tab.id);
      if (isReaderModeAvailable) {
        console.log(LOG_MESSAGES.toggleOn);
        await toggleNativeReaderMode(tab);
      } else {
        console.log(LOG_MESSAGES.forcingReaderMode);
        await forceActivateReaderView(tab);
      }
    }
  } catch (error) {
    console.error(`Error toggling Reader Mode for tab (ID: ${tab.id}):`, error);
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
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        await toggleReaderMode(activeTab);
      }
    } catch (error) {
      console.error(`Error processing command (${command}):`, error);
    }
  }
});
