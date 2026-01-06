# 🎨 Gemini Code Highlighter

**A browser extension that brings professional syntax highlighting and custom themes to Google Gemini.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-2.0.0-green)
![Status](https://img.shields.io/badge/status-active-success)

Gemini's default code blocks can be hard to read, especially for long sessions. This extension replaces the default styling with **Highlight.js**, offering high-performance rendering and a variety of popular themes (Dracula, GitHub, Monokai, etc.) for a better developer experience.

## ✨ Key Features

- **Syntax Highlighting:** Supports 190+ languages via Highlight.js.
- **Theme Support:** Switch instantly between popular themes like **Dracula**, **Atom One Dark**, **GitHub**, **Nord**, and more.
- **High Performance:**
  - Uses a **Web Worker** architecture to process code off the main thread (non-blocking UI).
  - Implements **Debouncing** and efficient DOM observation for smooth scrolling during streaming.
- **Persistent Settings:** Remembers your theme and toggle state automatically.
- **Custom UI:** Styles the entire code container, including headers and copy buttons, to match the selected theme.

## 🚀 Installation

Since this extension is not yet in the Chrome/Firefox Web Store, you need to load it manually (Developer Mode).

1.  **Clone or Download** this repository.
    ```bash
    git clone [https://github.com/jasperfue/Gemini-Code-Fixer.git](https://github.com/jasperfue/Gemini-Code-Fixer.git)
    ```
2.  **Chrome / Brave / Edge:**
    - Go to `chrome://extensions/`.
    - Enable **Developer mode** (top right).
    - Click **Load unpacked**.
    - Select the folder of this repository.
3.  **Firefox:**
    - Go to `about:debugging`.
    - Click **This Firefox**.
    - Click **Load Temporary Add-on...**.
    - Select the `manifest.json` file.

## 🛠 Usage

1.  Open [gemini.google.com](https://gemini.google.com).
2.  Ask Gemini for code (e.g., "Write a Fibonacci function in TypeScript").
3.  Click the extension icon in your browser toolbar to open the **Dashboard**.
4.  **Select a Theme** from the dropdown menu.
5.  Enjoy readable code!

## 🏗 Tech Stack

- **Manifest V3**: Modern browser extension standard.
- **Highlight.js**: For parsing and tokenizing code.
- **Web Workers**: For background processing.
- **Vanilla JS**: No heavy frameworks, purely native performance.

## 🤝 Contributing

Contributions are welcome! Whether it's adding new themes, fixing bugs, or improving performance.

1.  Fork the project.
2.  Create your feature branch (`git checkout -b feature/AmazingTheme`).
3.  Commit your changes (`git commit -m 'Add AmazingTheme'`).
4.  Push to the branch (`git push origin feature/AmazingTheme`).
5.  Open a Pull Request.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Note:** This project is not affiliated with Google. It is an independent open-source tool.
