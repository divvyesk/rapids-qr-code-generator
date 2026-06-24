# Rapids QR Code Generator

A premium, interactive React (Next.js) web application designed to generate high-fidelity, offline-ready QR codes for website URLs and detailed contact cards.

Built with a sleek, glassmorphic dark-mode interface and an interactive cursor-tracking spotlight background effect.

## Key Features

-   **Dual Mode Input**:
    -   **URL Tab**: Input web links with a single-click paste function.
    -   **Contact Card Tab**: Multi-field form for First Name, Last Name, Organization, Email, and Location Address.
-   **Dynamic Fields**:
    -   Add **multiple phone numbers** dynamically via `+` buttons.
    -   Add **multiple website URLs** dynamically via `+` buttons.
-   **Static Offline vCards**:
    -   Generates QR codes containing direct, raw vCard (VCF) data.
    -   Requires **no internet connection** to parse. Scanning with any built-in iOS or Android camera app instantly triggers the OS-native "Add to Contacts" screen.
-   **Premium UI/UX Design**:
    -   Aesthetic space-obsidian color palette with indigo-cyan glowing borders and gradients.
    -   Global interactive spotlight background that tracks mouse movements.
    -   Haptic-inspired button pressed states and layout animations.
    -   100% Vector SVG icons (no standard text emojis).

## Getting Started

### Prerequisites

Make sure you have Node.js (version 18 or later) installed.

### Installation

1.  Clone or download the project folder.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

To launch the local development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your mobile or desktop browser to view the application.

## Vercel Deployment

This project is fully serverless-ready and optimized for Vercel:

1.  Commit and push your files to a Git repository (GitHub/GitLab/Bitbucket).
2.  Import your repository into the [Vercel Dashboard](https://vercel.com/dashboard).
3.  Vercel will auto-detect Next.js. Click **Deploy**.

Alternatively, deploy directly via the Vercel CLI:
```bash
npx vercel
```
