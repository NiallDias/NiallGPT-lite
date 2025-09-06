# NiallGPT 1.0

NiallGPT: A web application with an AI chat and image generator, featuring light and dark themes.

## Prerequisites

- Node.js (v18 or higher recommended)

## Setup and Running

1.  **Install dependencies:**
    From the root of the project, run:
    ```bash
    npm install
    ```

2.  **Set up your API Key:**
    Create a file named `.env.local` in the root of the project. Add your Gemini API key to this file:
    ```
    API_KEY="YOUR_GEMINI_API_KEY"
    ```
    > **Note:** The application is configured to use the `API_KEY` environment variable.

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:5173` (or the next available port).
