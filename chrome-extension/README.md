# Manus Use Case Quick Launcher

A Chrome extension that lets you browse and launch Manus use cases from a convenient side panel.

## Features

- Browse use cases directly from Chrome's side panel
- Search by category (job function and feature)
- Open session replays with one click
- Discover what people build with Manus

## Installation

### From Release (Recommended)

1. Download the latest `.zip` from the [Releases](https://github.com/alanalyzing/awesome-manus-usecases/releases) page
2. Unzip the downloaded file
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked** and select the unzipped folder

### From Source

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `chrome-extension` directory

## Usage

Click the extension icon in your Chrome toolbar to open the side panel. From there you can:

- Browse all published use cases from [awesome.manus.space](https://awesome.manus.space)
- Filter by job function or feature category
- Click any use case to view details or launch the session replay

## Version

Current version: **2.1.0**

## Permissions

- `storage` — Save your preferences locally
- `sidePanel` — Display the use case browser in Chrome's side panel
- `tabGroups` — Organize opened use case tabs
- Host access to `https://awesome.manus.space/*` for fetching use case data
