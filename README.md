# 🍳 Kitchen Buddy — Cook Timer, Unit Converter & Grocery List

Your essential cooking companion, right inside your browser. Kitchen Buddy is a lightweight Chrome extension that brings a **multi-timer with alerts**, a **kitchen unit converter**, and a **persistent grocery checklist** — all accessible from a single popup.

---

## ✨ Features

### ⏱️ Multi-Timer
- Create multiple named timers simultaneously (e.g. "Boil Pasta", "Bake Bread").
- Set hours, minutes, and seconds with an intuitive interface.
- Receive alerts when timers complete so you never overcook again.

### 🔄 Unit Converter
- Instantly convert between common cooking measurements:
  - **Volume** — Cups, Millilitres, Litres, Tablespoons, Teaspoons, Fluid Ounces, Quarts, Gallons.
  - **Weight** — Grams, Kilograms, Ounces, Pounds.
  - **Temperature** — °F ↔ °C.
- One-click swap between source and target units.
- Built-in quick-reference card for the most common conversions.

### ✅ Grocery Checklist
- Add ingredients on-the-fly while browsing recipes.
- Check off items as you shop.
- Clear checked items or the entire list with a single click.
- Persists across browser sessions via Chrome Storage.

---

## 🚀 Installation

### From Source (Developer Mode)
1. Clone or download this repository.
2. Open **Chrome** → navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the project folder.
5. The Kitchen Buddy icon will appear in your toolbar — click it to start!

---

## 📁 Project Structure

```
Kitchen-Buddy/
├── icons/
│   ├── icon16.png        # Toolbar icon (16×16)
│   ├── icon48.png        # Extensions page icon (48×48)
│   └── icon128.png       # Chrome Web Store icon (128×128)
├── manifest.json         # Extension manifest (Manifest V3)
├── popup.html            # Popup UI structure
├── popup.css             # Styles & theme
├── popup.js              # Core logic (timers, converter, checklist)
├── .gitignore
└── README.md
```

---

## 🛡️ Permissions

| Permission | Reason |
|------------|--------|
| `storage`  | Persist timers and grocery list across sessions. |
| `alarms`   | Fire timer alerts even when the popup is closed. |

---

## 🛠️ Tech Stack

- **Manifest V3** — Latest Chrome extension standard.
- **Vanilla HTML / CSS / JavaScript** — Zero dependencies, instant load.
- **Chrome Storage API** — Reliable, synced data persistence.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m "Add amazing feature"`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

## 👤 Owner

**[cookmagical.com](https://cookmagical.com)**

---

> Made with ❤️ for home cooks everywhere.
