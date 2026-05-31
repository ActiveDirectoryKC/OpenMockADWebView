# OpenMockADWebView
For generating AD Layouts and visualizing AD structure from JSON for mocking and testing. 
Inspired by [MockAD](https://github.com/shokkadev/MockAD-Release) by [shokkadev](https://github.com/shokkadev). 

This tool is an HTML, CSS, and Javascript-based tool that can be run locally or via a static webpage to help simulate, visulaize, and mock-up Active Directory (AD) environments. Creating OUs and groups, etc. is slow and tedious. This is intended to make it a little faster. 

> Disclaimer: This tool is based off MockAD and AI assistance was used to create the tool. Please review any outputs and log issues for anything not working as expected.

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
