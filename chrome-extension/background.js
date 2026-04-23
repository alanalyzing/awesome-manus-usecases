// Open the side panel when the extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openTabGroup") {
    openAsTabGroup(message.urls, message.groupName);
    sendResponse({ success: true });
  }
  return true; // keep channel open for async
});

async function openAsTabGroup(urls, groupName) {
  if (!urls || urls.length === 0) return;

  // Create all tabs
  const tabIds = [];
  for (const url of urls) {
    const tab = await chrome.tabs.create({ url, active: false });
    tabIds.push(tab.id);
  }

  // Group the tabs
  const groupId = await chrome.tabs.group({ tabIds });

  // Name and color the group
  await chrome.tabGroups.update(groupId, {
    title: groupName || "Manus Use Cases",
    color: "grey",
    collapsed: false,
  });

  // Activate the first tab in the group
  if (tabIds.length > 0) {
    chrome.tabs.update(tabIds[0], { active: true });
  }
}
