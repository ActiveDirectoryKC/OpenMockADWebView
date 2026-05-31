# OpenMockADWebView
For generating AD Layouts and visualizing AD structure from JSON for mocking and testing. 
Inspired by the following. 
- [MockAD](https://github.com/shokkadev/MockAD-Release) by [shokkadev](https://github.com/shokkadev).
- [md2ADUC](https://github.com/JimSycurity/md2ADUC) by [JimSycurity](https://github.com/JimSycurity).

This tool is an HTML, CSS, and Javascript-based tool that can be run locally or via a static webpage to help simulate, visulaize, and mock-up Active Directory (AD) environments. Creating OUs and groups, etc. is slow and tedious. This is intended to make it a little faster. 

> **Disclaimer:** This tool is based off MockAD and AI assistance was used to create the tool.
> Please review any outputs and log issues for anything not working as expected.

---

# Getting Started 
## How to Use the Tool
There are two options. 

### Option 1 - Github Hosted Web View
Just connect to the following link and you'll have it displayed in your browser. It is hosted on GitHub and it is a pretty boring HTML page in the sense that nothing is gathered or retained. Everything happens client-side. 

- [OpenMockADWebView Public Site](https://activedirectorykc.github.io/OpenMockADWebView)

### Option 2 - Download and Run
Download the latest release / main and launch the web page manually. 

- [Releases](https://github.com/ActiveDirectoryKC/OpenMockADWebView/releases/)

## Importing JSON Files
You can import it two ways. 

### From the "Load JSON" Button
1. In the top banner find the "Load JSON" button. Click it.
2. Select the appropriate JSON file on your system and upload it.
3. The Tree view should refresh automatically with the new data.

### From The Builder
1. In the center pane, click "{} JSON". This displays the structure in JSON
2. Past in the JSON you wish to use.
3. Click "Load JSON" button. Click it.
4. The Tree View should refresh accordingly.


---

# More Details
## Origins
I like MockAD and this was and is not intended to steal any thunder from that work. However, when trying to use MockAD in May 2026, I ran into weird issues with how the Edge Webview rendered that made MockAD kind hard to work with. There were scaling issues in the applications. Also, MockAD is closed source and generated warnings due to being unsigned code.

MockAD gave me really good JSON for an environment. My plan was to to pop it into Claude and have Claude turn it into a quick webpage so I could take a screenshot to send along. Well, Claude overdid it and gave me something that already rivaled MockAD's functions in one go. I decided to push it further. 

## Features
- JSON Import / Export. Imports the same JSON format that MockAD uses and exports it too!
- Browser-based. Download it local. It doesn't reach out, and it doesn't phone home, it is entirely client side.
- Export to PNG - Rather than having to do stuff to make this work, just click "Export to PNG" and you have a version of your structure as a picture.
- Prebuilt-environments - Use one of the pre-built buttons to generate the environment based off my designs. You can edit them and make your own!
- Built-in Simple Markdown Support for notes - MockAD had this, I just continued it.
  - Headers supported
  - Bold, Italics, Underline
  - Lists.
  - More can be added.
- Limited external dependencies - No external fonts, etc. Just Unicode and a web page.
- Open Source. All of it is here and free to use.

## Roadmap
All good projects need a plan. I hope to continue this down the road. 

- Tagging of objects using mark down. This is less about notes and more about identifying what each OU is for. The goal here is to allow for other scripts to feed off this information in a very programmatic way.
- Script generation. We already have the structure. Can we just dump out the PowerShell needed to make it a thing? 
